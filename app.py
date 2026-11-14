import os

import certifi
import seaborn as sns
import streamlit as st

os.environ.setdefault("SSL_CERT_FILE", certifi.where())

st.set_page_config(
    page_title="MPG Explorer",
    page_icon="🚘",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .stApp {
        background: linear-gradient(180deg, #f3f7fc 0%, #ffffff 48%);
    }
    .block-container {
        max-width: 1400px;
        padding-top: 2rem;
        padding-bottom: 3rem;
    }
    .hero {
        padding: 2rem 2.2rem;
        margin-bottom: 1.4rem;
        border-radius: 22px;
        color: #ffffff;
        background: linear-gradient(115deg, #10213b, #2457a6);
    }
    .hero-label {
        color: #b9d6ff;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
    .hero h1 {
        margin: 0.45rem 0;
        color: #ffffff;
        font-size: clamp(2rem, 4vw, 3rem);
    }
    .hero p {
        margin: 0;
        color: #e2ecfb;
        font-size: 1.05rem;
    }
    div[data-testid="stMetric"] {
        padding: 1rem 1.1rem;
        border: 1px solid #e5eaf2;
        border-radius: 16px;
        background: #ffffff;
    }
    </style>
    <div class="hero">
        <div class="hero-label">MPG Explorer · Avto tahlili</div>
        <h1>Avtomobil samaradorligi</h1>
        <p>Yoqilg'i tejamkorligini avtomobil turi, og'irligi va ishlab chiqarilgan yili bo'yicha o'rganing.</p>
    </div>
    """,
    unsafe_allow_html=True,
)


@st.cache_data(show_spinner="Dataset yuklanmoqda...")
def load_data():
    return sns.load_dataset("mpg").dropna(
        subset=["mpg", "weight", "cylinders", "model_year", "origin"]
    )


df = load_data()
origin_labels = {
    "Barchasi": None,
    "AQSH": "usa",
    "Yevropa": "europe",
    "Yaponiya": "japan",
}
cylinder_options = sorted(df["cylinders"].unique().tolist())
min_year = int(df["model_year"].min()) + 1900
max_year = int(df["model_year"].max()) + 1900

with st.sidebar:
    st.header("Filtrlar")
    selected_origin = st.selectbox("Hudud", list(origin_labels))
    selected_cylinders = st.multiselect(
        "Silindrlar soni",
        cylinder_options,
        default=cylinder_options,
        format_func=lambda value: f"{value} silindr",
    )
    selected_years = st.slider(
        "Model yillari",
        min_value=min_year,
        max_value=max_year,
        value=(min_year, max_year),
    )
    st.caption("Datasetdagi avtomobillar 1970–1982 model yillariga tegishli.")

filtered_df = df[
    df["cylinders"].isin(selected_cylinders)
    & df["model_year"].between(selected_years[0] - 1900, selected_years[1] - 1900)
]
origin = origin_labels[selected_origin]
if origin is not None:
    filtered_df = filtered_df[filtered_df["origin"] == origin]

if filtered_df.empty:
    st.info("Tanlangan filtrlarga mos avtomobil topilmadi. Filtrlarni o'zgartiring.")
    st.stop()

metric_columns = st.columns(4)
metric_columns[0].metric("Avtomobillar", f"{len(filtered_df):,}")
metric_columns[1].metric("O'rtacha MPG", f"{filtered_df['mpg'].mean():.1f}")
metric_columns[2].metric("Eng yuqori MPG", f"{filtered_df['mpg'].max():.1f}")
metric_columns[3].metric("O'rtacha og'irlik", f"{filtered_df['weight'].mean():,.0f} lb")

left_chart, right_chart = st.columns(2)
with left_chart:
    st.subheader("Og'irlik va yoqilg'i tejamkorligi")
    st.scatter_chart(
        filtered_df,
        x="weight",
        y="mpg",
        color="origin",
        x_label="Og'irlik (lb)",
        y_label="MPG",
    )

with right_chart:
    st.subheader("Yillar bo'yicha o'rtacha MPG")
    mpg_by_year = (
        filtered_df.groupby("model_year", as_index=False)["mpg"]
        .mean()
        .assign(model_year=lambda values: values["model_year"] + 1900)
    )
    st.line_chart(
        mpg_by_year,
        x="model_year",
        y="mpg",
        x_label="Model yili",
        y_label="O'rtacha MPG",
    )

left_chart, right_chart = st.columns(2)
with left_chart:
    st.subheader("Silindrlar bo'yicha o'rtacha MPG")
    mpg_by_cylinders = (
        filtered_df.groupby("cylinders", as_index=False)["mpg"].mean()
    )
    st.bar_chart(
        mpg_by_cylinders,
        x="cylinders",
        y="mpg",
        x_label="Silindrlar soni",
        y_label="O'rtacha MPG",
    )

with right_chart:
    st.subheader("Hududlar bo'yicha o'rtacha MPG")
    mpg_by_origin = (
        filtered_df.groupby("origin", as_index=False)["mpg"].mean()
    )
    st.bar_chart(
        mpg_by_origin,
        x="origin",
        y="mpg",
        x_label="Hudud",
        y_label="O'rtacha MPG",
    )

with st.expander("Datasetni ko'rish"):
    st.dataframe(filtered_df, hide_index=True, width="stretch")

st.caption(
    "Manba: Seaborn MPG dataset. MPG — bir gallon yoqilg'ida bosib o'tiladigan masofa."
)
