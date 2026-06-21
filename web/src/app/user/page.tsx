import { redirect } from 'next/navigation';

export default function UserIndexPage() {
  redirect('/citizen/login');
}
