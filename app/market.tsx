"use client";
import {prepareProfileImage} from './profile-image';
import {PortfolioGallery} from './portfolio-gallery';
import { useLanguage, LanguageSwitcher, localeTags } from "./i18n/provider";
import {ReportLink} from './compliance-ui';
import {AuthDialog,AuthLogout,AuthPanel,EmailVerification} from './auth-ui';
import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Wrench,
  Sparkles,
  GraduationCap,
  Monitor,
  Truck,
  Scissors,
  PawPrint,
  Grid2X2,
  MapPin,
  CalendarDays,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Star,
  MessageCircle,
  Camera,
  Dumbbell,
  HeartPulse,
  Shirt,
  Leaf,
  HandHelping,
  BriefcaseBusiness,
  PartyPopper,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const categories = [
  ["Все услуги", Grid2X2],
  ["IT и дизайн", Monitor],
  ["Аниматоры", PartyPopper],
  ["Для животных", PawPrint],
  ["Красота и здоровье", HeartPulse],
  ["Одежда", Shirt],
  ["Обучение", GraduationCap],
  ["Переезд и Доставка", Truck],
  ["Разовая работа и подработка", BriefcaseBusiness],
  ["Ремонт", Wrench],
  ["Сад и двор", Leaf],
  ["Спорт", Dumbbell],
  ["Уборка помещений", Sparkles],
  ["Уход и помощь", HandHelping],
  ["Фото и видео", Camera],
  ["Другое", Grid2X2],
] as const;
const cities = [
  "Рига",
  "Юрмала",
  "Даугавпилс",
  "Лиепая",
  "Елгава",
  "Вентспилс",
  "Резекне",
  "Валмиера",
  "Екабпилс",
  "Огре",
  "Цесис",
  "Сигулда",
  "Марупе",
  "Адажи",
  "Саласпилс",
  "Бауска",
  "Тукумс",
  "Кулдига",
  "Талси",
  "Салдус",
  "Добеле",
  "Гулбене",
  "Мадона",
  "Алуксне",
  "Лимбажи",
  "Прейли",
  "Ливаны",
  "Айзкраукле","Айзпуте","Айнажи","Акнисте","Алоя","Апе","Ауце","Балви","Балдоне","Баложи","Броцены","Валдемарпилс","Валка","Вангажи","Варакляны","Виесите","Виляка","Виляны","Гробиня","Дагда","Зилупе","Иецава","Икшкиле","Илуксте","Кандава","Карсава","Кегумс","Кекава","Кокнесе","Краслава","Лигатне","Лиелварде","Лубана","Лудза","Мазсалаца","Олайне","Павилоста","Пилтене","Плявиняс","Приекуле","Руйиена","Сабиле","Салацгрива","Саулкрасты","Седа","Скрунда","Смилтене","Стайцеле","Стенде","Стренчи","Субате","Царникава","Цесвайне","Яунелгава",
  "Другой населённый пункт Латвии",
  "Удалённо · Латвия",
];
type Item = {
  id: string;
  kind: string;
  title?: string;
  name: string;
  description: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  mine?: boolean;
  parent?: string;
  status?: string;
  chosen?: string;
  skills?: string;
  portfolio?: string;
  photo?: string;
  portfolioImages?: string[];
  cities?: string[];
  transport?: boolean;
  rating?: number;
  profile?: string;
  created?: string;
  basis?: string;
  deleted?: boolean;
};
type User = {
  name: string;
  role: "customer" | "provider" | null;
  isAdmin?: boolean;
  blocked?: boolean;
  inactive?: boolean;
  erased?: boolean;
  requiresTerms?: boolean;
};
const statusText = (s?: string) =>
  s === "active"
    ? "В работе"
    : s === "complete"
      ? "Завершено"
      : "Принимает отклики";
function Picker({
  label,
  value,
  onChange,
  values,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  values: string[];
}) {
  const { t } = useLanguage();
  return (
    <label>
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((v) => (
            <SelectItem key={v} value={v}>
              {t(v)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export default function Home() {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [authOpen,setAuthOpen]=useState(false),[authQueryHandled,setAuthQueryHandled]=useState(false),[hiddenDecisions,setHiddenDecisions]=useState<string[]>([]),[mineTab,setMineTab]=useState('tasks');
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [portfolioToKeep, setPortfolioToKeep] = useState<string[]>([]);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [deepLinkHandled,setDeepLinkHandled]=useState(false);
  const { locale, t, errorText } = useLanguage();
  const [view, setView] = useState("profile"),
    [category, setCategory] = useState("Все услуги"),
    [query, setQuery] = useState(""),
    [city, setCity] = useState("Все города"),
    [records, setRecords] = useState<Item[]>([]),
    [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [formCategory, setFormCategory] = useState("Ремонт"),
    [formCity, setFormCity] = useState("Рига"),
    [role, setRole] = useState("customer"),
    [rating, setRating] = useState("5");
  useEffect(()=>{try{setHiddenDecisions(JSON.parse(localStorage.getItem('gigs_hidden_decisions')||'[]'));}catch{}} ,[]);
  function hideDecision(id:string){const next=[...hiddenDecisions,id];setHiddenDecisions(next);try{localStorage.setItem('gigs_hidden_decisions',JSON.stringify(next));}catch{}}
  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const r = await fetch("/api/market", {
          headers: { "X-SHABASHKA-Language": locale },
        });
        const d = (await r.json()) as {
          error: string;
          errorKey?: string;
          records: Item[];
          user: User | null;
        };
        if (!r.ok) throw Error(d.errorKey || d.error);
        setRecords(d.records);
        setUser(d.user);
        setLoadError("");
        return true;
      } catch (e) {
        setLoadError(
          e instanceof Error ? e.message : "Не удалось загрузить данные",
        );
        return false;
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [locale],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(()=>{if(loading||authQueryHandled)return;const params=new URLSearchParams(location.search);if(params.get('auth')==='login'){setAuthOpen(true);}else if(params.get('auth')==='complete'&&user){setView('mine');if(!user.role)setModal('register');history.replaceState(null,'','/');}setAuthQueryHandled(true);},[loading,user,authQueryHandled]);
  useEffect(()=>{if(loading||deepLinkHandled)return;const id=new URLSearchParams(location.search).get('item');if(id){const item=records.find(r=>r.id===id);if(item){setSelected(item);setModal('detail');}}setDeepLinkHandled(true);},[records,loading,deepLinkHandled]);
  useEffect(() => {
    if (modal !== "chat") return;
    const timer = setInterval(() => refresh(true), 5000);
    return () => clearInterval(timer);
  }, [modal, refresh]);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, opts: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "search_services",
            description: t("Показать специалистов по текстовому запросу"),
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: (input: { query: string }) => {
              if (typeof input?.query !== "string" || input.query.length > 200)
                throw Error(t("Некорректный запрос"));
              setQuery(input.query);
              setView("profile");
              setCategory("Все услуги");
              return { query: input.query };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [t]);
  function open(kind: string, item?: Item) {
    if(!user&&kind!=='detail'){setModal('');setAuthOpen(true);return;}
    setDeleteConfirmation(false);
    setError("");
    setNotice("");
    setSelected(item || null);
    setPortfolioToKeep(item?.portfolioImages || []);
    setProfilePhotoPreview(item?.photo || "");
    setCitySearch("");
    setFormCategory(item?.category || "Ремонт");
    setFormCity(item?.city && cities.includes(item.city) ? item.city : "Рига");
    setRole(user?.role || "customer");
    setModal(kind);
  }
  function taskDates(item: Item) {
    if (!item.dateFrom || !item.dateTo) return t('Сроки не указаны');
    const format = new Intl.DateTimeFormat(localeTags[locale], {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    const from = new Date(item.dateFrom+'T12:00:00Z'), to = new Date(item.dateTo+'T12:00:00Z');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return t('Сроки не указаны');
    return format.format(from)+' — '+format.format(to);
  }
  function bidStatus(bid: Item) {
    const task = taskFor(bid);
    if (!task) return t('Задание недоступно');
    if (task.deleted) return t('Задание удалено');
    if (task.chosen === bid.id) return t(task.status === 'complete' ? 'Работа завершена' : 'Вы выбраны исполнителем');
    return t(task.status === 'open' ? 'Отклик отправлен' : 'Выбран другой исполнитель');
  }
  function navigate(v: string) {
    setView(v);
    setCategory("Все услуги");
    setQuery("");
    setCity("Все города");
  }
  async function action(data: Record<string, unknown>, close = true) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/market", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SHABASHKA-Language": locale,
        },
        body: JSON.stringify(data),
      });
      const d = (await r.json()) as {
        error: string;
        errorKey?: string;
        records: Item[];
        user: User | null;
      };
      if (!r.ok) throw Error(d.errorKey || d.error);
      const loaded = await refresh(true);
      if (close) setModal("");
      setNotice(
        loaded
          ? "Сохранено."
          : "Сохранено. Обновите страницу для загрузки изменений.",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if(busy)return;
    const values: Record<string, unknown> = Object.fromEntries(new FormData(form));
    if (modal === 'profile') {
      setBusy(true);setError('');
      try {
      delete values.photo;delete values.portfolioImages;
      const photo = form.querySelector<HTMLInputElement>('input[name="photo"]')?.files?.[0];
      const images = Array.from(form.querySelector<HTMLInputElement>('input[name="portfolioImages"]')?.files || []);
      if(portfolioToKeep.length + images.length > 10)throw Error('Не более 10 фотографий портфолио.');
      if (photo) values.photo = await prepareProfileImage(photo);
      values.portfolioImages=[...portfolioToKeep];
      for(const file of images)(values.portfolioImages as string[]).push(await prepareProfileImage(file));
      values.transport=new FormData(form).get('transport')==='on';
      values.cities = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="cities"]:checked')).map(input=>input.value);
      if(!(values.cities as string[]).length)throw Error('Выберите населённый пункт Латвии');
      }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить');setBusy(false);return;}
    }
    const kind = modal === "chat" ? "message" : modal;
    if (
      await action(
        {
          ...values,
          action: kind,
          category: formCategory,
          city: formCity,
          role,
          reopen:!!user?.erased,
          rating,
          parent: selected?.id,
        },
        kind !== "message",
      )
    ) {
      if (kind === "message") form.reset();
      else if (kind === "profile") navigate("profile");
      else navigate("mine");
    }
  }
  const profiles = records.filter((r) => r.kind === "profile");
  const source =
    view === "profile"
      ? profiles
      : view === "task"
        ? records.filter((r) => r.kind === "task" && !r.deleted)
        : records.filter((r) => r.mine && (
            mineTab === 'tasks' ? r.kind === 'task' :
            mineTab === 'bids' ? r.kind === 'bid' :
            mineTab === 'profile' ? r.kind === 'profile' : false
          ));
  const items = source.filter(
    (r) =>
      (category === "Все услуги" || r.category === category) &&
      (
        r.title +
        " " +
        r.description +
        " " +
        r.name +
        " " +
        r.skills +
        " " +
        t(r.category) +
        " " +
        t(r.city)
      )
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (city === "Все города" || r.city === city || (r.kind === 'profile' && (r.cities?.includes(city) || r.cities?.includes('По всей Латвии')))),
  );
  const detail = selected
    ? records.find((r) => r.id === selected.id) || selected
    : null;
  const reviews = (id: string) =>
    records.filter((r) => r.kind === "review" && r.profile === id);
  const ratingText = (id: string) => {
    const list = reviews(id);
    return list.length
      ? t("Рейтинг: {rating} · Отзывы: {count}", {
          rating: new Intl.NumberFormat(localeTags[locale], {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }).format(
            list.reduce((a, r) => a + (r.rating || 0), 0) / list.length,
          ),
          count: new Intl.NumberFormat(localeTags[locale]).format(list.length),
        })
      : t("Пока нет отзывов");
  };
  const taskFor = (bid: Item) =>
    records.find((r) => r.kind === "task" && r.id === bid.parent);
  return (
    <>
      <header>
        <a className="logo brand" href="/">
          Gigs<span>✳</span>
        </a>
        <nav>
          <button
            className={view === "profile" ? "nav-active" : ""}
            onClick={() => navigate("profile")}
          >
            {t("Найти специалиста ")}
          </button>
          <button
            className={view === "task" ? "nav-active" : ""}
            onClick={() => navigate("task")}
          >
            {t("Найти задание ")}
          </button>
        </nav>
        <div className="header-right">
          <LanguageSwitcher />
        </div>
      </header>
      <main>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            document
              .getElementById("results")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              view === "task"
                ? t("Какое задание вы ищете?")
                : t("Какая помощь вам нужна?")
            }
            aria-label={t("Поиск")}
          />
          <button className="primary">{t("Найти ")}</button>
        </form>
        <div className={`category-picker ${categoriesExpanded ? 'expanded' : 'collapsed'}`}>
        <section className="categories" id="service-categories">
          {categories.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              className={category === name ? "active" : ""}
              aria-pressed={category === name}
            >
              <Icon size={24} />
              <span>{t(name)}</span>
            </button>
          ))}
        </section>
        {!categoriesExpanded && <div className="category-preview" aria-hidden="true">{categories.slice(4,8).map(([name,Icon])=><span key={name}><Icon size={24}/><span>{t(name)}</span></span>)}</div>}
        <button type="button" className="category-toggle" aria-controls="service-categories" aria-expanded={categoriesExpanded} onClick={()=>setCategoriesExpanded(value=>!value)}>
          <span>{t(categoriesExpanded?'Свернуть категории':'Все категории')}</span><ChevronDown size={20}/>
        </button>
        </div>
        {notice && (
          <div className="feedback" role="status">
            {t(notice)}
          </div>
        )}
        {loadError && (
          <div className="error" role="alert">
            {errorText(loadError)}{" "}
            <button onClick={() => refresh()}>{t("Повторить ")}</button>
          </div>
        )}
        <div className="content" id="results">
          <section>
            <div className="section-head">
              <h2>
                {view === "profile"
                  ? t("Специалисты под ваше дело")
                  : view === "task"
                    ? t("Задания для вас")
                    : t("Мой кабинет")}
              </h2>
              <button aria-label={t("Обновить")} onClick={() => refresh()}>
                <RefreshCw size={17} />
              </button>
            </div>
            <div className="filters">
              <Tabs value={view} onValueChange={navigate}>
                <TabsList>
                  <TabsTrigger value="profile">{t("Специалисты ")}</TabsTrigger>
                  <TabsTrigger value="task">{t("Задания ")}</TabsTrigger>
                  <TabsTrigger value="mine">{t("Мой кабинет")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger aria-label={t("Город")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Все города", ...cities].map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {view === 'mine' && <div className="mine-tabs" role="tablist" aria-label={t('Разделы кабинета')}>
              {([['tasks','Мои задания'],['bids','Мои отклики'],['profile','Мой профиль'],['decisions','Решения по публикациям']] as const).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={mineTab===value} onClick={()=>setMineTab(value)}>{t(label)}</button>)}
            </div>}
            {view === "mine" && (
              <div className="account">
                <h3>{user?.name || t("Ваши задания и предложения")}</h3><EmailVerification/>
                <p>
                  {user?.role
                    ? t("Ваша роль: {role}", {
                        role: t(
                          user.role === "customer" ? "заказчик" : "исполнитель",
                        ),
                      })
                    : user
                      ? t("Выберите роль, чтобы завершить регистрацию.")
                      : t("Войдите, чтобы публиковать задания и откликаться.")}
                </p>
                <div className="account-actions">
                  {user?.requiresTerms && <button className="outline" onClick={()=>open('register')}>{t('Примите обновлённые условия в кабинете.')}</button>}
                  {user?.inactive && <p>{t('Аккаунт неактивен. Откройте настройки данных.')}</p>}
                  {user?.isAdmin && <a className="outline" href="/admin">{t("Админка")}</a>}
                  {user?.blocked && <p role="alert">{t("Ваш аккаунт заблокирован администратором.")}</p>}
                  {!user ? (
                    <button className="dark" onClick={()=>setAuthOpen(true)}>{t("Войти")}</button>
                  ) : (
                    <>
                      <button
                        className="outline"
                        onClick={() => open("register")}
                      >
                        {user.role
                          ? t("Изменить имя или роль")
                          : t("Завершить регистрацию")}
                      </button>
                      {user.role === "provider" && (
                        <button
                          className="primary"
                          onClick={() =>
                            open(
                              "profile",
                              profiles.find((p) => p.mine),
                            )
                          }
                        >
                          {t("Мой профиль исполнителя ")}
                        </button>
                      )}
                      {user.role === "customer" && (
                        <button
                          className="primary"
                          onClick={() => open("task")}
                        >
                          {t("Создать задание ")}
                        </button>
                      )}
                      {user && <a className="outline" href="/privacy">{t('Мои данные')}</a>}
                      <AuthLogout/>
                    </>
                  )}
                </div>
              </div>
            )}
            {view==='mine' && mineTab==='decisions' && records.filter(r=>r.kind==='notice'&&r.mine&&!hiddenDecisions.includes(r.id)).map(r=><div className="feedback" key={r.id}><div className="feedback-heading"><strong>{t('Решение по публикации')}</strong><button type="button" className="auth-link" onClick={()=>hideDecision(r.id)}>{t('Скрыть решение')}</button></div><p>{r.description}</p><p>{t('Основание')}: {r.basis}</p><p>{t('Решение принято человеком. Если вы не согласны, отправьте оператору номер обращения и обоснование пересмотра.')} {r.parent}</p><a href="mailto:igors.nikos@gmail.com">igors.nikos@gmail.com</a></div>)}
            {loading && <p role="status">{t("Загружаем данные\u2026 ")}</p>}
            {mineTab !== 'decisions' && <div className="cards">
              {items.map((item, i) => (
                item.kind === 'profile' ? <article className="specialist-card" key={item.id}>
                  <div className="specialist-heading">
                    <div className={'specialist-avatar color'+(i%4)}>{item.photo?<img src={item.photo} alt={item.name} loading="lazy"/>:item.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                    <div className="specialist-identity"><span className="specialist-category">{t(item.category)}</span><h3><button onClick={()=>open('detail',item)}>{item.name}</button></h3><div className="specialist-rating"><Star size={16}/>{ratingText(item.id)}</div></div>
                  </div>
                  {item.title&&<h4 className="specialist-title">{item.title}</h4>}
                  <div className="specialist-facts"><div><MapPin size={16}/><span>{(item.cities?.length?item.cities:[item.city||'Латвия']).map(city=>t(city)).join(' · ')}</span></div>{item.transport&&<div><Truck size={16}/><span>{t('Собственный транспорт')}</span></div>}</div>
                  {item.description&&<p className="specialist-description">{item.description}</p>}
                  {item.skills&&<ul className="specialist-skills" aria-label={t('Навыки')}>{item.skills.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,5).map((skill,index)=><li key={index}>{skill}</li>)}</ul>}
                  {!!item.portfolioImages?.length ? <PortfolioGallery images={item.portfolioImages} previewCount={3}/> : <div className="portfolio-empty"><Camera size={24}/><div><strong>{t('Портфолио пока не добавлено')}</strong><span>{item.mine ? t('Добавьте фотографии своих работ, чтобы клиентам было проще выбрать вас.') : t('Исполнитель ещё не добавил фотографии своих работ.')}</span></div>{item.mine&&view==='mine'&&mineTab==='profile'&&<button className="outline" onClick={()=>open('profile',item)}>{t('Добавить фото')}</button>}</div>}
                  <div className="specialist-actions"><button className="primary" onClick={()=>open('detail',item)}>{t('Посмотреть профиль')}</button>{view==='mine'&&mineTab==='profile'&&item.mine&&<button className="outline" onClick={()=>open('profile',item)}>{t('Изменить профиль')}</button>}</div>
                  <ReportLink id={item.id}/>
                </article> : item.kind === 'task' ? <article className="specialist-card task-card" key={item.id}>
                  <div className="task-heading"><span className="specialist-category">{t(item.category)}</span><span className={'task-status task-status-'+(item.deleted?'deleted':item.status||'open')}>{t(item.deleted?'Удалено':statusText(item.status))}</span></div>
                  <h3 className="task-title"><button onClick={()=>open('detail',item)}>{item.title}</button></h3>
                  <p className="specialist-description">{item.description}</p>
                  <div className="task-facts"><div><MapPin size={17}/><span>{t(item.city||'Латвия')}</span></div><div><CalendarDays size={17}/><span><small>{t('Срок выполнения')}</small>{taskDates(item)}</span></div></div>
                  <div className="task-customer"><span className="task-customer-avatar" aria-hidden="true">{item.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span><span><small>{t('Заказчик')}</small>{item.name}</span></div>
                  <div className="specialist-actions"><button className="primary" onClick={()=>open('detail',item)}>{t('Подробнее о задании')}</button>{item.mine&&!item.deleted&&<button className="outline" onClick={()=>{open('detail',item);setDeleteConfirmation(true);}}>{t('Удалить задание')}</button>}</div>
                  <ReportLink id={item.id}/>
                </article> : item.kind === 'bid' ? <article className="specialist-card response-card" key={item.id}>
                  <div className="task-heading"><span className="specialist-category">{t('Ваш отклик')}</span><span className="task-status">{bidStatus(item)}</span></div>
                  <h3 className="task-title"><button onClick={()=>open('detail',item)}>{taskFor(item)?.title||t('Предложение по заданию')}</button></h3>
                  {taskFor(item)&&<div className="specialist-facts"><div><MapPin size={16}/><span>{t(taskFor(item)?.city||'Латвия')}</span></div><div><CalendarDays size={16}/><span>{taskDates(taskFor(item)!)}</span></div></div>}
                  <div className="response-excerpt"><small>{t('Ваше предложение')}</small><p className="specialist-description">{item.description}</p></div>
                  {taskFor(item)&&<div className="task-customer"><span className="task-customer-avatar" aria-hidden="true">{taskFor(item)!.name.slice(0,1)}</span><span><small>{t('Заказчик')}</small>{taskFor(item)!.name}</span></div>}
                  <div className="specialist-actions"><button className="primary" onClick={()=>open('detail',item)}>{t('Посмотреть отклик')}</button><button className="outline" onClick={()=>open('chat',item)}><MessageCircle size={16}/>{t('Чат')}</button></div>
                </article> : <article className="card" key={item.id}>
                  <div className={"avatar color" + (i % 4)}>
                    {item.kind==='profile'&&item.photo ? <img className="card-profile-photo" src={item.photo} alt={item.name} loading="lazy"/> : <>
                    {item.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}</>}
                  </div>
                  <div>
                    <small>
                      {item.kind === "bid"
                          ? t("Ваш отклик")
                          : t(item.category)}
                    </small>
                    <h3>
                      <button onClick={() => open("detail", item)}>
                        {item.title ||
                          taskFor(item)?.title ||
                          t("Предложение по заданию")}
                      </button>
                    </h3>
                    <div className="person">{item.name}</div>
                    <p>{item.description}</p>
                    <div className="location">
                      <MapPin size={14} />
                      {t(item.city || taskFor(item)?.city || "Латвия")}
                    </div>
                    {item.kind === "profile" && (
                      <div className="rating">
                        <Star size={14} />
                        {ratingText(item.id)}
                      </div>
                    )}
                    {item.kind === "task" && (
                      <span className="status">
                        {t(item.deleted ? "Удалено" : statusText(item.status))}
                      </span>
                    )}
                    {item.kind === "bid" && (
                      <span className="status">
                        {taskFor(item)?.chosen === item.id
                          ? t("Вы выбраны исполнителем")
                          : taskFor(item)?.status === "open"
                            ? t("Отклик отправлен")
                            : t("Исполнитель выбран")}
                      </span>
                    )}
                    <div className="card-bottom">
                      {view === "mine" && mineTab === "profile" && item.kind === "profile" && item.mine && (
                        <button
                          className="outline card-open"
                          onClick={() => open("profile", item)}
                        >
                          {t("Изменить профиль")}
                        </button>
                      )}
                      <button
                        className="outline card-open"
                        onClick={() => open("detail", item)}
                      >
                        {t(item.kind==='profile'?'Посмотреть профиль':item.kind==='task'?'Подробнее о задании':'Посмотреть отклик')}
                      </button>
                    </div>
                    {['task','profile'].includes(item.kind) && <ReportLink id={item.id}/>}
                  </div>
                </article>
              ))}
            </div>}
            {!loading && !items.length && (
              <div className="empty">
                <Search size={28} />
                <h3>
                  {view === "mine"
                    ? t("Здесь будут ваши дела")
                    : t("Пока ничего не найдено")}
                </h3>
                <p>
                  {view === "task"
                    ? t("Создайте первое задание или измените поиск.")
                    : t(
                        "Попробуйте другую категорию или опубликуйте свой профиль.",
                      )}
                </p>
                <button className="outline" onClick={() => navigate(view)}>
                  {t("Сбросить фильтры ")}
                </button>
              </div>
            )}
          </section>
          <aside>
            <div className="notice">
              <span className="eyebrow">{t("ПРОСТО НАЧНИТЕ ")}</span>
              <h2>
                {t("Опишите задачу. ")}
                <br />
                {t("Остальное \u2014 ")}
                <br />
                {t("специалистам. ")}
              </h2>
              <p>
                {t(
                  "Получайте предложения, сравнивайте условия и выбирайте, с кем работать. ",
                )}
              </p>
              <button className="dark" onClick={() => open("task")}>
                {t("Создать задание ")}
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="aside-note">
              <Wrench size={21} />
              <h3>{t("Ваши навыки нужны ")}</h3>
              <p>
                {t(
                  "Находите задания по всей Латвии и предлагайте свои услуги. ",
                )}
              </p>
              <button
                className="text-button"
                onClick={() =>
                  open(
                    "profile",
                    profiles.find((p) => p.mine),
                  )
                }
              >
                {t("Стать исполнителем ")}
                <ArrowUpRight size={17} />
              </button>
            </div>
            <p className="direct-note">
              {t(
                "Договаривайтесь напрямую. Gigs не принимает оплату за работы. Стоимость и условия вы согласовываете друг с другом. ",
              )}
            </p>
          </aside>
        </div>
      </main>
      <footer>
        <span className="logo brand">Gigs✳</span>
      </footer>
      <AuthDialog open={authOpen} onClose={()=>setAuthOpen(false)}/>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) {
            setModal("");
            setError("");
          }
        }}
      >
        <DialogContent className={'market-dialog'+(modal==='detail'&&['profile','task','bid'].includes(detail?.kind||'')?' detail-dialog':'')} showCloseButton={false}>
          <div className="modal-toolbar">
          <LanguageSwitcher />
          <DialogClose className="dialog-close" aria-label={t("Закрыть")}>
            ×
          </DialogClose>
          </div>
          <DialogTitle className={modal==='detail'&&detail?.kind==='profile'?'sr-only':''}>
            {modal === "task"
              ? t("Новое задание")
              : modal === "profile"
                ? t("Профиль исполнителя")
                : modal === "bid"
                  ? t("Откликнуться на задание")
                  : modal === "register"
                    ? t("Ваш аккаунт")
                    : modal === "review"
                      ? t("Отзыв об исполнителе")
                      : modal === "chat"
                        ? t("Диалог по заданию")
                        : detail?.kind==='bid' ? t('Ваш отклик') : detail?.title || t("Ваше предложение")}
          </DialogTitle>
          <DialogDescription className={modal==='detail'?'sr-only':''}>
            {modal === "detail"
              ? detail?.kind === "profile"
                ? t("Профиль исполнителя")
                : detail?.kind === "task"
                  ? t("Условия и подробности")
                  : t("Условия и подробности")
              : modal === "chat"
                ? t(
                    "Переписку видят только заказчик и исполнитель. Сообщения обновляются автоматически.",
                  )
                : modal === "review"
                  ? t(
                      "Оцените работу выбранного исполнителя. Отзыв появится в его профиле.",
                    )
                  : modal === "register"
                    ? t(
                        "Один аккаунт, две роли. При необходимости роль можно сменить в кабинете.",
                      )
                    : modal === "bid"
                      ? t(
                          "Предложите цену в евро и опишите, как вы поможете. Отклик видите только вы и заказчик.",
                        )
                      : t(
                          "Заполните детали. Не указывайте личные контакты в публичном описании.",
                        )}
          </DialogDescription>
          {error && (
            <div className="error" role="alert">
              {errorText(error)}
            </div>
          )}
          {modal === "detail" && detail ? (
            <div className="details">
              {((detail.kind === "task" && detail.deleted) || (detail.kind === "bid" && taskFor(detail)?.deleted)) && <p className="feedback">{t("Задание удалено из каталога. История доступна только участникам.")}</p>}
              {detail.kind==='review' && <ReportLink id={detail.id}/>}
              {!['profile','task','bid'].includes(detail.kind) && <b>{detail.name}</b>}
              {!['profile','task','bid'].includes(detail.kind) && <p>{detail.description}</p>}
              {!['profile','task','bid'].includes(detail.kind) && (
                <p>
                  {detail.cities?.length ? detail.cities.map(city=>t(city)).join(' · ') : t(detail.city)}
                </p>
              )}
              {detail.kind === "profile" ? (
                <div className="profile-view">
                  <header className="profile-hero">
                    <div className="profile-hero-avatar">
                      {detail.photo ? (
                        <img src={detail.photo} alt={detail.name} loading="lazy" />
                      ) : (
                        <span>{detail.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                      )}
                    </div>
                    <div className="profile-hero-info">
                      {detail.category && <span className="profile-hero-category">{t(detail.category)}</span>}
                      <h3 className="profile-hero-name">{detail.name}</h3>
                      {detail.title&&<p className="profile-hero-service">{detail.title}</p>}
                      <div className="profile-hero-rating"><Star size={15} />{ratingText(detail.id)}</div>
                    </div>
                  </header>
                  <div className="profile-facts-grid profile-view-facts">
                    <div className="fact-card">
                      <MapPin size={18} />
                      <span>{(detail.cities?.length ? detail.cities : [detail.city || "Латвия"]).map((city) => t(city)).join(" · ")}</span>
                    </div>
                    {detail.category && (
                      <div className="fact-card">
                        <Wrench size={18} />
                        <span>{t(detail.category)}</span>
                      </div>
                    )}
                    {detail.transport && (
                      <div className="fact-card fact-card-accent">
                        <Truck size={18} />
                        <span>{t("Собственный транспорт")}</span>
                      </div>
                    )}
                  </div>
                  {detail.description && (
                    <section className="profile-view-section">
                      <h4 className="profile-view-heading">{t("О себе")}</h4>
                      <p className="profile-view-about">{detail.description}</p>
                    </section>
                  )}
                  {detail.skills && (
                    <section className="profile-view-section">
                      <h4 className="profile-view-heading">{t("Навыки ")}</h4>
                      <ul className="specialist-skills">
                        {detail.skills.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((skill, index) => (
                          <li key={index}>{skill}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section className="profile-view-section profile-view-portfolio">
                    <h4 className="profile-view-heading">{t("Портфолио ")}</h4>
                    {(detail.portfolioImages?.length || (detail.portfolio || "").split("\n").filter(Boolean).length) ? (
                      <>
                        {!!detail.portfolioImages?.length && <PortfolioGallery images={detail.portfolioImages} />}
                        {!!(detail.portfolio || "").split("\n").filter(Boolean).length && (
                          <div className="profile-view-links">
                            {(detail.portfolio || "").split("\n").filter(Boolean).map((link, i) => (
                              <a className="portfolio-link" key={i} href={link} target="_blank" rel="noopener noreferrer">
                                {t("Работа ")}{i + 1} <ArrowUpRight size={16} />
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="profile-view-empty">{t("Работы ещё не добавлены. ")}</p>
                    )}
                  </section>
                  <section className="profile-view-section profile-view-reviews">
                    <div className="profile-reviews-head">
                      <h4 className="profile-view-heading"><Star size={18} /> {t("Отзывы")}</h4>
                      {!!reviews(detail.id).length && <span className="profile-reviews-count">{reviews(detail.id).length}</span>}
                    </div>
                    {reviews(detail.id).length ? (
                      reviews(detail.id).map((r) => (
                        <div className="review-card" key={r.id}>
                          <div className="review-card-head">
                            <b>{r.name}</b>
                            <span className="review-card-stars"><Star size={13} />{r.rating}/5</span>
                          </div>
                          <p>{r.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="profile-view-empty">{t("Пока нет отзывов")}</p>
                    )}
                  </section>
                  <div className="detail-footer">{detail.mine&&<button className="primary" onClick={()=>open('profile',detail)}>{t('Изменить профиль')}</button>}<ReportLink id={detail.id}/></div>
                </div>
              ) : detail.kind === "bid" ? (
                <div className="response-view">
                  <span className="task-status">{bidStatus(detail)}</span>
                  {taskFor(detail)&&<section className="response-task"><span className="specialist-category">{t(taskFor(detail)?.category)}</span><h3>{taskFor(detail)?.title}</h3><div className="specialist-facts"><div><MapPin size={17}/><span>{t(taskFor(detail)?.city||'Латвия')}</span></div><div><CalendarDays size={17}/><span>{taskDates(taskFor(detail)!)}</span></div></div><p><span className="fact-label">{t('Заказчик')}: </span>{taskFor(detail)?.name}</p><button className="outline" onClick={()=>open('detail',taskFor(detail))}>{t('Подробнее о задании')}</button></section>}
                  <section className="task-description-section"><h4 className="profile-view-heading">{t('Ваше предложение')}</h4><p className="task-view-lead">{detail.description}</p></section>
                  <div className="detail-footer">
                  <button
                    className="primary"
                    onClick={() => open("chat", detail)}
                  >
                    <MessageCircle size={18} />
                    {t("Открыть чат с заказчиком ")}
                  </button>
                  </div>
                </div>
              ) : (
                <div className="task-view">
                  <div className="task-topline">
                    {detail.category && (
                      <span className="task-topline-cat">
                        {(() => {
                          const Icon = categories.find((c) => c[0] === detail.category)?.[1] || Grid2X2;
                          return <Icon size={18} />;
                        })()}
                        {t(detail.category)}
                      </span>
                    )}
                    <span className={"task-status task-status-" + (detail.deleted ? "deleted" : detail.status || "open")}>{t(detail.deleted ? "Удалено" : statusText(detail.status))}</span>
                  </div>
                  <div className="profile-facts-grid">
                    <div className="fact-card fact-card-col">
                      <MapPin size={18} />
                      <div><span className="fact-label">{t("Локация")}</span><span className="fact-value">{(detail.cities?.length ? detail.cities : [detail.city || "Латвия"]).map((city) => t(city)).join(" · ")}</span></div>
                    </div>
                    <div className="fact-card fact-card-col">
                      <CalendarDays size={18} />
                      <div><span className="fact-label">{t("Срок выполнения")}</span><span className="fact-value">{taskDates(detail)}</span></div>
                    </div>
                    {detail.mine&&<div className="fact-card fact-card-col">
                      <MessageCircle size={18} />
                      <div><span className="fact-label">{t("Отклики")}</span><span className="fact-value">{records.filter((r) => r.kind === "bid" && r.parent === detail.id).length}</span></div>
                    </div>}
                    <div className="fact-card fact-card-col fact-card-customer">
                      <span className="task-customer-avatar" aria-hidden="true">{detail.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                      <div><span className="fact-label">{t("Заказчик")}</span><span className="fact-value">{detail.name}</span></div>
                    </div>
                  </div>
                  {detail.description&&<section className="task-description-section"><h4 className="profile-view-heading">{t('Описание')}</h4><p className="task-view-lead">{detail.description}</p></section>}
                  <div className="task-view-actions">
                  {!detail.mine && !detail.deleted && detail.status === "open" && (
                    <button
                      className="primary"
                      onClick={() => open("bid", detail)}
                    >
                      {t("Откликнуться ")}
                    </button>
                  )}
                  {detail.mine && (
                    <>
                      {detail.kind === "task" && !detail.deleted && (
                        <div className="task-delete">
                          {deleteConfirmation ? <>
                            <p>{t("Удалить задание из каталога? Оно останется в кабинете участников вместе с откликами и перепиской. Отзывы сохранятся. Удаление объявления не отменяет ваши договорённости.")}</p>
                            <div className="account-actions">
                              <button className="outline" disabled={busy} onClick={() => setDeleteConfirmation(false)}>{t("Отмена")}</button>
                              <button className="outline" disabled={busy} onClick={async () => {if (await action({action:"delete-task",id:detail.id,confirm:true},false)) setDeleteConfirmation(false);}}>{t("Подтвердить удаление")}</button>
                            </div>
                          </> : <button className="outline" onClick={() => setDeleteConfirmation(true)}>{t("Удалить задание")}</button>}
                        </div>
                      )}
                      <h3>{t("Предложения исполнителей ")}</h3>
                      {records
                        .filter(
                          (r) => r.kind === "bid" && r.parent === detail.id,
                        )
                        .map((b) => (
                          <div className="bid" key={b.id}>
                            <b>
                              {b.name}
                            </b>
                            <p>{b.description}</p>
                            <div className="account-actions">
                              <button
                                className="outline"
                                onClick={() => open("chat", b)}
                              >
                                <MessageCircle size={16} />
                                {t("Чат ")}
                              </button>
                              {detail.status === "open" ? (
                                <button
                                  disabled={busy}
                                  className="primary"
                                  onClick={() =>
                                    action({ action: "choose", id: b.id })
                                  }
                                >
                                  {t("Выбрать исполнителя ")}
                                </button>
                              ) : detail.chosen === b.id ? (
                                <strong>{t("Исполнитель выбран ")}</strong>
                              ) : (
                                <span>{t("Другой исполнитель выбран ")}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      {!records.some(
                        (r) => r.kind === "bid" && r.parent === detail.id,
                      ) && <p>{t("Откликов пока нет. ")}</p>}
                      {detail.status === "active" && (
                        <button
                          disabled={busy}
                          className="primary"
                          onClick={() =>
                            action({ action: "complete", id: detail.id })
                          }
                        >
                          {t("Работа выполнена ")}
                        </button>
                      )}
                      {detail.status === "complete" &&
                        (records.some(
                          (r) => r.kind === "review" && r.parent === detail.id,
                        ) ? (
                          <p>{t("Спасибо! Ваш отзыв опубликован. ")}</p>
                        ) : (
                          <button
                            className="primary"
                            onClick={() => open("review", detail)}
                          >
                            {t("Оставить отзыв ")}
                          </button>
                        ))}
                    </>
                  )}
                  </div>
                  <div className="detail-footer"><ReportLink id={detail.id}/></div>
                </div>
              )}
            </div>
          ) : !user ? (
            <AuthPanel/>
          ) : modal !== "register" && !user.role ? (
            <button className="primary" onClick={() => open("register")}>
              {t("Завершить регистрацию ")}
            </button>
          ) : (modal === "task" && user.role !== "customer") ||
            ((modal === "profile" || modal === "bid") &&
              user.role !== "provider") ? (
            <div>
              <p>
                {t("Для этого действия выберите роль ")}{" "}
                {modal === "task" ? t("заказчика") : t("исполнителя")}.
              </p>
              <button className="primary" onClick={() => open("register")}>
                {t("Изменить роль ")}
              </button>
            </div>
          ) : (
            <>
              {modal === "chat" && (
                <div
                  className="messages"
                  role="log"
                  aria-label={t("Сообщения")}
                >
                  {records
                    .filter(
                      (r) => r.kind === "message" && r.parent === detail?.id,
                    )
                    .sort((a, b) =>
                      (a.created || "").localeCompare(b.created || ""),
                    )
                    .map((m) => (
                      <div
                        className={"message " + (m.mine ? "own" : "")}
                        key={m.id}
                      >
                        <strong>{m.name}</strong>
                        <p>{m.description}</p>
                        <small>
                          {m.created
                            ? new Date(m.created).toLocaleString(
                                localeTags[locale],
                                {
                                  timeZone: "Europe/Riga",
                                },
                              )
                            : ""}
                        </small>
                      </div>
                    ))}
                  {!records.some(
                    (r) => r.kind === "message" && r.parent === detail?.id,
                  ) && <p>{t("Обсудите детали и удобное время. ")}</p>}
                </div>
              )}
              <form
                onSubmit={submit}
                className="market-form"
                onInvalid={(e) => {
                  const field = e.target as HTMLInputElement;
                  field.setCustomValidity(
                    t(
                      field.validity.valueMissing
                        ? "Пожалуйста, заполните это поле."
                        : "Проверьте значение поля.",
                    ),
                  );
                }}
                onInput={(e) =>
                  (e.target as HTMLInputElement).setCustomValidity?.("")
                }
              >
                {modal === "register" ? (
                  <>
                    <label>
                      {t("Ваше имя ")}
                      <input
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={user.name}
                      />
                    </label>
                    <label>
                      {t("Роль ")}
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger aria-label={t("Роль")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">
                            {t("Заказчик \u2014 ищу помощь ")}
                          </SelectItem>
                          <SelectItem value="provider">
                            {t("Исполнитель \u2014 предлагаю услуги ")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="check-label"><input type="checkbox" name="acceptTerms" required/>{t('Я принимаю условия использования и ознакомился с политикой конфиденциальности.')}</label>
                    <p><a href="/legal/terms" target="_blank" rel="noreferrer">{t('Условия использования')}</a> · <a href="/legal/privacy" target="_blank" rel="noreferrer">{t('Конфиденциальность')}</a></p>
                  </>
                ) : (
                  <>
                    {modal === "task" && (
                      <>
                        <label>
                          {t("Что нужно сделать?")}
                          <input
                            name="title"
                            required
                            maxLength={140}
                            placeholder={t("Например, собрать шкаф")}
                          />
                        </label>
                        <Picker
                          label={t("Категория")}
                          value={formCategory}
                          onChange={setFormCategory}
                          values={categories.slice(1).map((c) => c[0])}
                        />
                        <Picker
                          label={t("Где в Латвии?")}
                          value={formCity}
                          onChange={setFormCity}
                          values={cities}
                        />
                      </>
                    )}
                    {modal === "profile" && (
                      <>
                        <section className="form-section">
                          <div className="profile-photo-editor">
                            <div className="profile-photo-preview">
                              {profilePhotoPreview ? (
                                <img src={profilePhotoPreview} alt={t("Аватар профиля")} />
                              ) : (
                                <span>{selected?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                              )}
                            </div>
                            <div className="profile-photo-meta">
                              <label className="file-button">
                                <Camera size={16} />
                                {t("Заменить фото профиля")}
                                <input
                                  name="photo"
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={(e) => {
                                    const file = e.currentTarget.files?.[0];
                                    if (file) setProfilePhotoPreview(URL.createObjectURL(file));
                                  }}
                                />
                              </label>
                              <span className="field-hint">{t("JPG, PNG или WebP. Лучше всего смотрится квадратное фото.")}</span>
                            </div>
                          </div>
                          <label>
                            {t("Название услуги")}
                            <input
                              name="title"
                              required
                              maxLength={140}
                              defaultValue={selected?.title}
                              placeholder={t("Например, сборка мебели и мелкий ремонт")}
                            />
                          </label>
                          <Picker
                            label={t("Категория")}
                            value={formCategory}
                            onChange={setFormCategory}
                            values={categories.slice(1).map((c) => c[0])}
                          />
                        </section>

                        <section className="form-section">
                          <h4 className="form-section-title">{t("Навыки и описание")}</h4>
                          <label>
                            {t("Навыки ")}
                            <input
                              name="skills"
                              required
                              maxLength={500}
                              defaultValue={selected?.skills}
                              placeholder={t("Например: сборка мебели, электрика")}
                            />
                            <span className="field-hint">{t("Перечислите через запятую — они покажутся тегами в вашей карточке.")}</span>
                          </label>
                          <label>
                            {t("О себе и услуге")}
                            <textarea
                              name="description"
                              required
                              maxLength={2000}
                              rows={4}
                              defaultValue={selected?.description}
                              placeholder={t("Расскажите, что вы делаете и почему стоит выбрать вас.")}
                            />
                          </label>
                        </section>

                        <section className="form-section">
                          <h4 className="form-section-title">{t("Где вы работаете")}</h4>
                          <label className="check-card">
                            <input type="checkbox" name="transport" defaultChecked={selected?.transport} />
                            <span>
                              <strong>{t("Собственный транспорт")}</strong>
                              <small>{t("Можете приехать к заказчику")}</small>
                            </span>
                          </label>
                          <fieldset className="city-picker">
                            <legend>{t("Города работы")}</legend>
                            <input
                              type="search"
                              className="city-search"
                              value={citySearch}
                              onChange={(e) => setCitySearch(e.target.value)}
                              placeholder={t("Поиск города…")}
                              aria-label={t("Поиск города…")}
                            />
                            <div className="city-list">
                              {['По всей Латвии', ...cities].map((city) => {
                                const label = t(city);
                                const match = !citySearch || label.toLowerCase().includes(citySearch.toLowerCase());
                                return (
                                  <label key={city} className="check-label" style={{ display: match ? undefined : "none" }}>
                                    <input
                                      type="checkbox"
                                      name="cities"
                                      value={city}
                                      defaultChecked={(selected?.cities || [selected?.city || formCity]).includes(city)}
                                    />
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                          <span className="field-hint">{t("Отметьте все населённые пункты, где готовы работать.")}</span>
                        </section>
                        <section className="form-section">
                          <h4 className="form-section-title">{t("Портфолио")}</h4>
                        <label>
                          {t("Портфолио \u2014 ссылки на работы ")}
                          <textarea
                            name="portfolio"
                            maxLength={1500}
                            defaultValue={selected?.portfolio}
                            rows={2}
                            placeholder={t(
                              "Каждая ссылка https:// с новой строки",
                            )}
                          />
                        </label>
                        {!!portfolioToKeep.length && (
                          <div className="portfolio-edit-grid">
                            {portfolioToKeep.map((image, index) => (
                              <div className="portfolio-edit-item" key={image}>
                                <img src={image} alt={`${t('Фото работы')} ${index + 1}`} />
                                <button
                                  type="button"
                                  className="portfolio-remove"
                                  aria-label={t('Удалить фото')}
                                  onClick={() => setPortfolioToKeep((current) => current.filter((_, i) => i !== index))}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="file-dropzone">
                          <Camera size={22} />
                          <span>
                            <strong>{t("Добавить фото в портфолио")}</strong>
                            <small>{t("До 10 фотографий, JPG · PNG · WebP")}</small>
                          </span>
                          <input name="portfolioImages" type="file" accept="image/jpeg,image/png,image/webp" multiple />
                        </label>
                        </section>
                      </>
                    )}
                    {modal === "review" && (
                      <Picker
                        label={t("Оценка от 1 до 5")}
                        value={rating}
                        onChange={setRating}
                        values={["5", "4", "3", "2", "1"]}
                      />
                    )}
                    {modal !== "profile" && (
                      <label>
                        {modal === "chat"
                          ? t("Сообщение")
                          : modal === "review"
                            ? t("Как прошла работа?")
                            : modal === "bid"
                              ? t("Ваше предложение")
                              : t("Описание")}
                        <textarea
                          name="description"
                          required
                          maxLength={2000}
                          rows={modal === "chat" ? 2 : 4}
                        />
                      </label>
                    )}
                    {modal==='task'&&<fieldset className="task-date-fields"><legend>{t('Срок выполнения')}</legend><label>{t('Дата начала')}<input type="date" name="dateFrom" required onChange={e=>{const end=e.currentTarget.form?.elements.namedItem('dateTo') as HTMLInputElement|null;if(end)end.min=e.currentTarget.value;}}/></label><label>{t('Дата окончания')}<input type="date" name="dateTo" required/></label></fieldset>}
                  </>
                )}
                <button className="primary" disabled={busy}>
                  {busy
                    ? t("Сохраняем\u2026")
                    : modal === "register"
                      ? t("Сохранить аккаунт")
                      : modal === "chat"
                        ? t("Отправить")
                        : modal === "review"
                          ? t("Опубликовать отзыв")
                          : modal === "bid"
                            ? t("Отправить отклик")
                            : modal === "profile"
                              ? t("Сохранить профиль")
                              : t("Опубликовать задание")}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

