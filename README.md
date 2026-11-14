# MPG Explorer

Responsive, interactive vehicle-efficiency dashboard built as a static site. It uses the Seaborn MPG dataset in `data/mpg.json` and requires no server-side runtime.

## Run locally

From the project directory, start a static web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to Vercel

### Quick deploy

1. Open [Vercel Drop](https://vercel.com/drop).
2. Drag the project folder into the page. Do not include `.venv`.
3. Vercel deploys the static site and provides a public URL.

### Deploy from Git

1. Push the project files to a Git repository.
2. Import the repository in Vercel and keep the project root as the Root Directory.
3. Choose the **Other** framework preset. No build command or output directory is required.
4. Deploy. Vercel serves `index.html` and the local assets directly.
