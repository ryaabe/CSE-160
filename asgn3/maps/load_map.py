import argparse
import json
from pathlib import Path

from litemapy import Schematic

DEFAULT_MINECRAFT_TO_BLOCK_ID = {
    # grass-like
    "minecraft:grass_block": "grass",
    # wood-like
    "minecraft:oak_log": "wood",
    "minecraft:spruce_log": "wood",
    "minecraft:birch_log": "wood",
    "minecraft:jungle_log": "wood",
    "minecraft:acacia_log": "wood",
    "minecraft:dark_oak_log": "wood",
    "minecraft:mangrove_log": "wood",
    "minecraft:cherry_log": "wood",
    "minecraft:oak_planks": "wood",
    "minecraft:spruce_planks": "wood",
    "minecraft:birch_planks": "wood",
    "minecraft:jungle_planks": "wood",
    "minecraft:acacia_planks": "wood",
    "minecraft:dark_oak_planks": "wood",
    "minecraft:mangrove_planks": "wood",
    "minecraft:cherry_planks": "wood",
    # leaves
    "minecraft:oak_leaves": "leaf",
    "minecraft:spruce_leaves": "leaf",
    "minecraft:birch_leaves": "leaf",
    "minecraft:jungle_leaves": "leaf",
    "minecraft:acacia_leaves": "leaf",
    "minecraft:dark_oak_leaves": "leaf",
    "minecraft:mangrove_leaves": "leaf",
    "minecraft:cherry_leaves": "leaf",
    "minecraft:azalea_leaves": "leaf",
    "minecraft:flowering_azalea_leaves": "leaf",
    # utility
    "minecraft:air": "air",
    "minecraft:cave_air": "air",
    "minecraft:void_air": "air",
}


def print_region_all_layers(region):
    if region is None:
        raise ValueError("error parsing region: region is None")

    ys = list(region.range_y())
    if not ys:
        raise ValueError("region has empty y range")

    for y in ys:
        print(f"\n=== y = {y} ===")
        for z in region.range_z():
            for x in region.range_x():
                block = region[x, y, z]
                if block.id == "minecraft:air":
                    print(".", end="")
                else:
                    print("#", end="")
            print()


def block_to_state_key(block):
    block_id = getattr(block, "id", str(block))
    properties = getattr(block, "properties", None)

    # litemapy versions differ: properties may be a dict-like attribute or a method.
    if callable(properties):
        try:
            properties = properties()
        except Exception:
            properties = None

    if properties is None:
        return block_id

    if hasattr(properties, "items"):
        properties = dict(properties.items())
    else:
        try:
            properties = dict(properties)
        except Exception:
            return block_id

    if not properties:
        return block_id

    pairs = [f"{key}={properties[key]}" for key in sorted(properties.keys(), key=str)]
    return f"{block_id}[{','.join(pairs)}]"


def load_mapping(mapping_path):
    mapping = dict(DEFAULT_MINECRAFT_TO_BLOCK_ID)

    if not mapping_path:
        return mapping, None

    path = Path(mapping_path)
    if not path.exists():
        # Mapping file is optional. Built-in defaults are still used.
        return mapping, None

    user_mapping = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(user_mapping, dict):
        raise ValueError("mapping file must be a JSON object: {minecraft_key: blockId}")

    for minecraft_key, block_id in user_mapping.items():
        if not isinstance(minecraft_key, str) or not isinstance(block_id, str):
            raise ValueError("mapping keys/values must be strings")
        mapping[minecraft_key] = block_id

    return mapping, str(path)


def resolve_block_id(block, mapping, fallback_block_id):
    minecraft_state_key = block_to_state_key(block)
    minecraft_block_id = block.id

    if minecraft_state_key in mapping:
        return mapping[minecraft_state_key], minecraft_state_key

    if minecraft_block_id in mapping:
        return mapping[minecraft_block_id], minecraft_state_key

    # Simple heuristics for test mappings.
    if "grass" in minecraft_block_id:
        return "grass", minecraft_state_key
    if "leaf" in minecraft_block_id or "leaves" in minecraft_block_id:
        return "leaf", minecraft_state_key
    if minecraft_block_id.endswith("_log") or minecraft_block_id.endswith("_planks"):
        return "wood", minecraft_state_key
    if minecraft_block_id in ("minecraft:air", "minecraft:cave_air", "minecraft:void_air"):
        return "air", minecraft_state_key

    return fallback_block_id, minecraft_state_key


def region_to_world_data(
    region,
    region_name,
    source_file,
    mapping,
    fallback_block_id="default",
    include_air=False,
    mapping_file_used=None,
):
    xs = list(region.range_x())
    ys = list(region.range_y())
    zs = list(region.range_z())
    if not xs or not ys or not zs:
        raise ValueError("region has empty dimensions")

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)

    palette = []
    palette_to_index = {}
    blocks = []
    source_to_block_id = {}
    unmapped_source_blocks = set()
    spawn = {
        "x": (len(xs) - 1) // 2,
        "y": len(ys) + 1,
        "z": (len(zs) - 1) // 2,
    }

    for y in ys:
        for z in zs:
            for x in xs:
                block = region[x, y, z]
                block_id, source_key = resolve_block_id(
                    block=block,
                    mapping=mapping,
                    fallback_block_id=fallback_block_id,
                )

                source_to_block_id[source_key] = block_id

                if block_id == "air" and not include_air:
                    continue

                if block_id == fallback_block_id and block.id not in mapping and source_key not in mapping:
                    unmapped_source_blocks.add(source_key)

                if block_id not in palette_to_index:
                    palette_to_index[block_id] = len(palette)
                    palette.append(block_id)

                blocks.append([
                    x - min_x,
                    y - min_y,
                    z - min_z,
                    palette_to_index[block_id],
                ])

    return {
        "format": "asgn3-world-v2",
        "meta": {
            "source_file": source_file,
            "region_name": region_name,
            "bounds": {
                "min": {"x": min_x, "y": min_y, "z": min_z},
                "max": {"x": max_x, "y": max_y, "z": max_z},
            },
            "size": {
                "x": len(xs),
                "y": len(ys),
                "z": len(zs),
            },
            "offset": {"x": min_x, "y": min_y, "z": min_z},
            "include_air": include_air,
            "fallback_block_id": fallback_block_id,
            "mapping_file": mapping_file_used,
            "spawn": spawn,
        },
        "spawn": spawn,
        "palette": palette,
        "blocks": blocks,
        "source_to_block_id": source_to_block_id,
        "unmapped_source_blocks": sorted(unmapped_source_blocks),
    }


def choose_region(schematic, region_name):
    if not schematic.regions:
        raise ValueError("Schematic has no regions")

    if region_name:
        if region_name not in schematic.regions:
            names = ", ".join(schematic.regions.keys())
            raise ValueError(
                f'Region "{region_name}" not found. Available regions: {names}'
            )
        return region_name, schematic.regions[region_name]

    first_name = next(iter(schematic.regions.keys()))
    return first_name, schematic.regions[first_name]


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Load a .litematic file and export region block data as JSON "
            "for JS world-grid loading."
        )
    )
    parser.add_argument("litematic_file", help="Path to .litematic file")
    parser.add_argument(
        "--out",
        default="maps/world_data.json",
        help="Output JSON file path (default: maps/world_data.json)",
    )
    parser.add_argument(
        "--region",
        default=None,
        help="Region name to export (default: first region in schematic)",
    )
    parser.add_argument(
        "--print-slices",
        action="store_true",
        help="Print #/. y-slices for debug output",
    )
    parser.add_argument(
        "--include-air",
        action="store_true",
        help="Include minecraft:air blocks in output data",
    )
    parser.add_argument(
        "--mapping",
        default="maps/minecraft_to_blockdata.json",
        help=(
            "Optional JSON mapping file: {minecraft_id_or_state: blockId}. "
            "Built-in defaults are always included and can be overridden."
        ),
    )
    parser.add_argument(
        "--fallback-block-id",
        default="default",
        help="Fallback blockId when a Minecraft block has no mapping (default: default)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    input_path = Path(args.litematic_file)

    schematic = Schematic.load(str(input_path))
    if schematic is None:
        raise ValueError(f"Failed to load schematic: {input_path}")

    region_name, region = choose_region(schematic, args.region)

    if args.print_slices:
        print_region_all_layers(region)

    mapping, mapping_file_used = load_mapping(args.mapping)

    world_data = region_to_world_data(
        region=region,
        region_name=region_name,
        source_file=input_path.name,
        mapping=mapping,
        fallback_block_id=args.fallback_block_id,
        include_air=args.include_air,
        mapping_file_used=mapping_file_used,
    )

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(world_data, indent=2), encoding="utf-8")

    print(f"Exported {len(world_data['blocks'])} blocks to {output_path}")
    print(f"Block palette ({len(world_data['palette'])}): {world_data['palette']}")
    if world_data["unmapped_source_blocks"]:
        print(
            "Unmapped source blocks fell back to "
            f"'{args.fallback_block_id}': {len(world_data['unmapped_source_blocks'])}"
        )


if __name__ == "__main__":
    main()
