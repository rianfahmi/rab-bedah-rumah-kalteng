import type { Metadata } from 'next';
export const metadata: Metadata = {title:'RAB Bedah Rumah Kalteng',description:'Rekap BNBA, penetapan CPB, penyusunan RAB, dan penetapan PB Kalimantan Tengah.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><head><link rel="stylesheet" href="/style.css" /></head><body>{children}</body></html>}
