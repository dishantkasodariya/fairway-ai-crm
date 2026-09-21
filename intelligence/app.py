import csv
import io

import streamlit as st
import streamlit.components.v1 as components

from config import PLACES_API_KEY
from discovery.tiling import find_companies_tiled, hex_grid_centers
from map_builder import build_map
from discovery.places_api import MAX_RADIUS_M

SUB_RADIUS_M = 3000  # fixed base sub-circle radius — depth-0 only, no auto-subdivision

st.set_page_config(page_title="Warehouse Radius — Nearby Companies", layout="wide")
st.title("Warehouse Radius — Nearby Companies")
st.caption(
    "Tiles your search radius into 3km sub-circles (no auto-subdivision), "
    "queries each, and merges/deduplicates the results — same approach validated on Surat's 50km sweep."
)

col1, col2, col3 = st.columns(3)
lat = col1.number_input("Warehouse latitude", value=21.4779173, format="%.6f")
lng = col2.number_input("Warehouse longitude", value=72.7234733, format="%.6f")
radius_km = col3.number_input(
    "Radius (km)", min_value=0.1, max_value=MAX_RADIUS_M / 1000, value=10.0, step=1.0
)
radius_m = radius_km * 1000

num_calls = len(hex_grid_centers(lat, lng, radius_m, SUB_RADIUS_M))
st.info(
    f"This will make **{num_calls} API calls** (fixed 3km sub-circles, no subdivision) — "
    f"well within the free monthly tier for typical radii. Estimated time: ~{num_calls / 5:.0f}s at 5 req/s."
)

search = st.button("Find companies", type="primary")

if search:
    with st.spinner(f"Querying {num_calls} sub-circles..."):
        try:
            result = find_companies_tiled(
                lat, lng, radius_m, PLACES_API_KEY,
                base_sub_radius_m=SUB_RADIUS_M,
                max_depth=0,  # depth-0 only — no auto-subdivision, fixed call count
                max_workers=4,
                max_qps=5,
            )
        except Exception as e:
            st.error(f"Search failed: {e}")
            result = None

    if result is not None:
        companies = result["companies"]
        stats = result["stats"]

        st.success(
            f"Found **{stats['unique_companies']} companies** within {radius_km:.1f} km "
            f"using {stats['total_calls']} API calls "
            f"({stats['total_raw_candidates']} raw candidates before type filtering/dedup)."
        )
        if stats["failed_calls"]:
            st.warning(f"{stats['failed_calls']} sub-circles failed after retries — coverage may have small gaps.")

        fmap = build_map(lat, lng, radius_m, companies, output_path=None, cluster=len(companies) > 150)
        components.html(fmap._repr_html_(), height=600)

        st.subheader("Company details")
        table_rows = [
            {
                "Name": c["name"],
                "Type": c["primary_type"],
                "Distance (km)": round(c["distance_km"], 2) if c.get("distance_km") is not None else None,
                "Address": c["address"],
                "Phone": c["phone"],
                "Website": c["website"],
            }
            for c in companies
        ]
        st.dataframe(table_rows, use_container_width=True)

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=list(table_rows[0].keys()) if table_rows else [])
        writer.writeheader()
        writer.writerows(table_rows)
        st.download_button(
            "Download companies as CSV",
            data=csv_buffer.getvalue(),
            file_name=f"companies_{lat}_{lng}_{radius_km}km.csv",
            mime="text/csv",
        )

        with st.expander("Per-sub-circle call log (diagnostics)"):
            st.caption("Full raw request/response JSON for every call is in logs/places_api.log")
            st.dataframe(result["call_log"], use_container_width=True)
