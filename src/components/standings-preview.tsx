import Link from 'next/link';
import {Trophy,ArrowRight} from 'lucide-react';
import {createClient} from '@/lib/supabase/server';
import {isConfigured} from '@/lib/supabase/env';
import {EmptyState} from './ui';
export async function StandingsPreview(){
 if(isConfigured()){
  const db=await createClient();
  const[rows,days]=await Promise.all([db.rpc('spectator_standings',{target_matchday:null}),db.rpc('spectator_matchdays',{})]);
  if(rows.error||days.error)return <EmptyState title="Resultados no disponibles" description="No se ha podido consultar la clasificación oficial." href="/leagues" label="Volver a consultar" icon={Trophy}/>;
  if(days.data.length&&rows.data.length)return <><ol className="standings-preview">{rows.data.slice(0,3).map(r=><li key={r.fantasy_team_id}><span>{r.position}</span><strong>{r.fantasy_team_name}</strong><b>{Number(r.total_points).toLocaleString('es-ES')} <small>pts</small></b></li>)}</ol><Link className="text-link" href="/leagues">Clasificación completa<ArrowRight size={16}/></Link></>;
 }
 return <EmptyState title="Todo está por decidir." description="La clasificación aparecerá tras validar la primera jornada." href="/leagues" label="Consultar clasificación" icon={Trophy}/>;
}
