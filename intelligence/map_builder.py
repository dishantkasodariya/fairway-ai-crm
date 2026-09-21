import folium
from folium.plugins import MarkerCluster


def build_map(warehouse_lat, warehouse_lng, radius_m, companies, output_path=None, cluster=False):
    """Render the warehouse, its radius, and nearby companies to a Folium map.

    cluster=True groups markers (MarkerCluster) — use for large result sets
    (hundreds+) where individual markers would be too dense/slow to render.

    Saves to output_path if given. Always returns the folium.Map object —
    use fmap._repr_html_() to embed it (e.g. in Streamlit) without saving.
    """
    fmap = folium.Map(location=[warehouse_lat, warehouse_lng], zoom_start=13)

    folium.Marker(
        location=[warehouse_lat, warehouse_lng],
        popup="Your Warehouse",
        icon=folium.Icon(color="red", icon="warehouse", prefix="fa"),
    ).add_to(fmap)

    folium.Circle(
        location=[warehouse_lat, warehouse_lng],
        radius=radius_m,
        color="red",
        weight=2,
        fill=True,
        fill_opacity=0.08,
    ).add_to(fmap)

    marker_target = MarkerCluster().add_to(fmap) if cluster else fmap

    for company in companies:
        if company["lat"] is None or company["lng"] is None:
            continue

        popup_html = f"""
        <b>{company['name']}</b><br>
        {company.get('primary_type') or ''}<br>
        {company.get('address') or ''}<br>
        {'Phone: ' + company['phone'] if company.get('phone') else ''}<br>
        {'Web: ' + company['website'] if company.get('website') else ''}<br>
        {'Distance: %.2f km' % company['distance_km'] if company.get('distance_km') is not None else ''}
        """

        folium.Marker(
            location=[company["lat"], company["lng"]],
            popup=folium.Popup(popup_html, max_width=300),
            icon=folium.Icon(color="blue", icon="building", prefix="fa"),
        ).add_to(marker_target)

    if output_path:
        fmap.save(output_path)
    return fmap
