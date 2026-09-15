import { requireChatGPTUser } from "../chatgpt-auth";
import { isAdmin } from "../admin-access";
import AdminPanel from "./panel";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata = {title:"Админка — Gigs", robots:{index:false,follow:false}};
export default async function AdminPage() {
  const user=await requireChatGPTUser("/admin");
  if(!isAdmin(user)) return <main lang="ru" className="admin-shell"><h1>Доступ ограничен</h1><p>Этот раздел доступен только администратору.</p><a href="/">Вернуться на сайт</a><p><a href="/signout-with-chatgpt?return_to=/admin" target="_top">Выйти и сменить аккаунт</a></p></main>;
  return <AdminPanel />;
}
