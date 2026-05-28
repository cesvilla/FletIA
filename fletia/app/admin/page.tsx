import AdminClient from './AdminClient';

// La ruta /admin ya está protegida por el middleware (solo pasa ADMIN_EMAIL)
export default function AdminPage() {
  return <AdminClient />;
}
