// Simple Express server placeholder. Not used by GitHub Pages.
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors()); app.use(express.json());

app.get('/health', (_req,res)=>res.json({ok:true, ts: Date.now()}));

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Backend on http://localhost:'+port));
