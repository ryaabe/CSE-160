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


def resolve_block_id_with_context(region, x, y, z, block, mapping, fallback_block_id, y_min, y_max):
    minecraft_block_id = getattr(block, "id", None)
    source_key = block_to_state_key(block)

    if minecraft_block_id in ("minecraft:purple_concrete", "minecraft:pink_concrete"):
        window_prefix = "unlit_window" if minecraft_block_id == "minecraft:purple_concrete" else "lit_window"

        def same_block_at(test_y):
            if test_y < y_min or test_y > y_max:
                return False
            try:
                neighbor = region[x, test_y, z]
            except Exception:
                return False
            return getattr(neighbor, "id", None) == minecraft_block_id

        has_same_above = same_block_at(y + 1)
        has_same_below = same_block_at(y - 1)

        if has_same_above and not has_same_below:
            return f"{window_prefix}_bottom", source_key
        if has_same_below and not has_same_above:
            return f"{window_prefix}_top", source_key

        # Fallback for malformed or unexpected stacks. Assume lower half when ambiguous.
        if has_same_above:
            return f"{window_prefix}_bottom", source_key
        if has_same_below:
            return f"{window_prefix}_top", source_key
        return f"{window_prefix}_bottom", source_key

    return resolve_block_id(block, mapping, fallback_block_id)


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
                block_id, source_key = resolve_block_id_with_context(
                    region=region,
                    x=x,
                    y=y,
                    z=z,
                    block=block,
                    mapping=mapping,
                    fallback_block_id=fallback_block_id,
                    y_min=min_y,
                    y_max=max_y,
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


def _iter_world_blocks(world_data):
    palette = world_data.get("palette")
    blocks = world_data.get("blocks")
    if not isinstance(palette, list) or not isinstance(blocks, list):
        raise ValueError("world_data must contain list fields: palette and blocks")

    for entry in blocks:
        if not isinstance(entry, list) or len(entry) < 4:
            continue
        x, y, z, palette_index = entry[:4]
        if not all(isinstance(v, (int, float)) for v in (x, y, z)):
            continue
        if not isinstance(palette_index, int):
            continue
        if palette_index < 0 or palette_index >= len(palette):
            continue
        block_id = palette[palette_index]
        if not isinstance(block_id, str):
            continue
        yield int(x), int(y), int(z), block_id


def _compute_bounds_meta_from_coords(coords):
    if not coords:
        return None

    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    zs = [c[2] for c in coords]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)
    return {
        "bounds": {
            "min": {"x": min_x, "y": min_y, "z": min_z},
            "max": {"x": max_x, "y": max_y, "z": max_z},
        },
        "size": {
            "x": (max_x - min_x) + 1,
            "y": (max_y - min_y) + 1,
            "z": (max_z - min_z) + 1,
        },
        "offset": {"x": min_x, "y": min_y, "z": min_z},
    }


def merge_world_data_at_offset(base_world_data, import_world_data, place_at):
    if not isinstance(place_at, (list, tuple)) or len(place_at) != 3:
        raise ValueError("place_at must be a 3-item tuple/list: (x, y, z)")

    ox, oy, oz = [int(v) for v in place_at]

    coord_to_block_id = {}

    # Start with existing world blocks.
    for x, y, z, block_id in _iter_world_blocks(base_world_data):
        if block_id == "air":
            continue
        coord_to_block_id[(x, y, z)] = block_id

    # Overlay imported blocks at the requested destination. Import "air" deletes.
    for x, y, z, block_id in _iter_world_blocks(import_world_data):
        wx, wy, wz = x + ox, y + oy, z + oz
        key = (wx, wy, wz)
        if block_id == "air":
            coord_to_block_id.pop(key, None)
            continue
        coord_to_block_id[key] = block_id

    merged_palette = []
    palette_to_index = {}

    def ensure_palette_id(block_id):
        if block_id not in palette_to_index:
            palette_to_index[block_id] = len(merged_palette)
            merged_palette.append(block_id)
        return palette_to_index[block_id]

    # Preserve base palette order first for smaller diffs/stability.
    for block_id in base_world_data.get("palette", []):
        if isinstance(block_id, str) and block_id != "air":
            ensure_palette_id(block_id)

    # Then any new block IDs introduced by the import.
    for block_id in coord_to_block_id.values():
        ensure_palette_id(block_id)

    sorted_items = sorted(coord_to_block_id.items(), key=lambda item: (item[0][1], item[0][2], item[0][0]))
    merged_blocks = [
        [x, y, z, ensure_palette_id(block_id)]
        for (x, y, z), block_id in sorted_items
    ]

    merged = dict(base_world_data)
    merged["format"] = base_world_data.get("format", import_world_data.get("format", "asgn3-world-v2"))
    merged["palette"] = merged_palette
    merged["blocks"] = merged_blocks

    base_source_map = base_world_data.get("source_to_block_id")
    import_source_map = import_world_data.get("source_to_block_id")
    merged_source_map = {}
    if isinstance(base_source_map, dict):
        merged_source_map.update(base_source_map)
    if isinstance(import_source_map, dict):
        merged_source_map.update(import_source_map)
    if merged_source_map:
        merged["source_to_block_id"] = merged_source_map

    base_unmapped = set(base_world_data.get("unmapped_source_blocks") or [])
    import_unmapped = set(import_world_data.get("unmapped_source_blocks") or [])
    merged["unmapped_source_blocks"] = sorted(base_unmapped | import_unmapped)

    merged_meta = dict(base_world_data.get("meta") or {})
    merged_meta.setdefault("merged_sources", [])
    if isinstance(merged_meta["merged_sources"], list):
        merged_meta["merged_sources"].append(
            {
                "source_file": (import_world_data.get("meta") or {}).get("source_file"),
                "region_name": (import_world_data.get("meta") or {}).get("region_name"),
                "placed_at": {"x": ox, "y": oy, "z": oz},
            }
        )

    bounds_meta = _compute_bounds_meta_from_coords(coord_to_block_id.keys())
    if bounds_meta:
        merged_meta.update(bounds_meta)

    # Preserve spawn from the existing world unless the caller chooses otherwise (not implemented yet).
    if "spawn" in base_world_data:
        merged["spawn"] = base_world_data["spawn"]
    if "spawn" in merged_meta and "spawn" in base_world_data.get("meta", {}):
        merged_meta["spawn"] = base_world_data["meta"]["spawn"]

    merged["meta"] = merged_meta
    return merged


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
    parser.add_argument(
        "--merge-into",
        default=None,
        help=(
            "Existing world_data.json to merge into. When set, the converted schematic is "
            "added on top of that world instead of replacing it."
        ),
    )
    parser.add_argument(
        "--place-at",
        nargs=3,
        type=int,
        metavar=("X", "Y", "Z"),
        default=None,
        help=(
            "World-space placement for the imported schematic's min corner when using "
            "--merge-into (example: --place-at 120 4 30)."
        ),
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

    if args.merge_into:
        if args.place_at is None:
            raise ValueError("--place-at X Y Z is required when using --merge-into")

        merge_target_path = Path(args.merge_into)
        if not merge_target_path.exists():
            raise FileNotFoundError(f"Merge target world_data.json not found: {merge_target_path}")

        base_world_data = json.loads(merge_target_path.read_text(encoding="utf-8"))
        world_data = merge_world_data_at_offset(
            base_world_data=base_world_data,
            import_world_data=world_data,
            place_at=tuple(args.place_at),
        )

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(world_data, indent=2), encoding="utf-8")

    if args.merge_into:
        print(
            f"Merged import into {args.merge_into} at {tuple(args.place_at)} and wrote "
            f"{len(world_data['blocks'])} total blocks to {output_path}"
        )
    else:
        print(f"Exported {len(world_data['blocks'])} blocks to {output_path}")
    print(f"Block palette ({len(world_data['palette'])}): {world_data['palette']}")
    if world_data["unmapped_source_blocks"]:
        print(
            "Unmapped source blocks fell back to "
            f"'{args.fallback_block_id}': {len(world_data['unmapped_source_blocks'])}"
        )


if __name__ == "__main__":
    main()
