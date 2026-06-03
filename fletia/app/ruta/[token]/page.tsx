import RutaPublicaClient from './RutaPublicaClient';

export const metadata = {
  title: 'Tu ruta — FletIA',
  description: 'Mapa, peajes, clima y tráfico de tu viaje.',
};

export default function RutaPublicaPage({ params }: { params: { token: string } }) {
  return <RutaPublicaClient token={params.token} />;
}
