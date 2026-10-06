# Lu's Shoe Farm (monorepo)

Next.js storefront + admin CMS (`apps/web`) and FastAPI + PostgreSQL API (`apps/api`)

## Run locally
```bash
npm install                               
cp .env.example apps/api/.env                
npm run db:up                                
cd apps/api && python -m venv .venv &&
source .venv/Scripts/activate --> 
source .venv/bin/activate for linusandmacOS
pip install -r requirements.txt
python -m app.seed                          
cd ../.. && npm run dev:api               
npm run dev:web                             
```