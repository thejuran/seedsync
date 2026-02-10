"""Booking eligibility resolver -- determines which resorts a contract can book."""

# Original 14 DVC resorts (pre-January 2019) -- resale contracts can book any of these
ORIGINAL_14_RESORTS = [
    "old_key_west",
    "boardwalk",
    "wilderness_lodge_boulder_ridge",  # Boulder Ridge Villas
    "wilderness_lodge_copper_creek",   # Copper Creek Villas
    "beach_club",
    "hilton_head",
    "vero_beach",
    "animal_kingdom_jambo",
    "animal_kingdom_kidani",
    "saratoga_springs",
    "bay_lake_tower",
    "grand_floridian",
    "polynesian",
    "aulani",
]

# Post-January 2019 resorts -- resale contracts can ONLY book home resort
RESTRICTED_RESORTS = [
    "riviera",
    "disneyland_hotel",           # Villas at Disneyland Hotel
    "cabins_fort_wilderness",     # Cabins at Fort Wilderness
]

ALL_RESORTS = ORIGINAL_14_RESORTS + RESTRICTED_RESORTS
