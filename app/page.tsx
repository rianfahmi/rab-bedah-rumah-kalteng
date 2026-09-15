'use client';
import {useEffect} from 'react';
export default function Page(){useEffect(()=>{const s=document.createElement('script');s.src='/app.js?v=20260915-fast-detail';s.type='module';document.body.appendChild(s);return()=>s.remove()},[]);return <><div id="app"><main className="container"><h1>RAB Bedah Rumah Kalteng</h1><p>Memuat data BNBA…</p></main></div><dialog id="document"><div id="doc-content" /></dialog></>}
