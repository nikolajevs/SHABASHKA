"use client";
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
  Plus,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Star,
  MessageCircle,
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
  ["Ремонт", Wrench],
  ["Уборка", Sparkles],
  ["Обучение", GraduationCap],
  ["IT и дизайн", Monitor],
  ["Доставка", Truck],
  ["Красота", Scissors],
  ["Для животных", PawPrint],
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
  "Другой населённый пункт Латвии",
  "Удалённо · Латвия",
];
type Item = {
  id: string;
  kind: string;
  title?: string;
  name: string;
  description: string;
  price: string;
  city?: string;
  category?: string;
  mine?: boolean;
  parent?: string;
  status?: string;
  chosen?: string;
  skills?: string;
  portfolio?: string;
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
  const [authOpen,setAuthOpen]=useState(false),[authQueryHandled,setAuthQueryHandled]=useState(false),[hiddenDecisions,setHiddenDecisions]=useState<string[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
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
    setFormCategory(item?.category || "Ремонт");
    setFormCity(item?.city && cities.includes(item.city) ? item.city : "Рига");
    setRole(user?.role || "customer");
    setModal(kind);
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
    const values = Object.fromEntries(new FormData(form));
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
        : records.filter(
            (r) => r.mine && ["task", "bid", "profile"].includes(r.kind),
          );
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
      (city === "Все города" || r.city === city),
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
          <button className="outline" onClick={() => user?navigate("mine"):setAuthOpen(true)}>
            {t(user?"Мой кабинет ":"Войти")}
          </button>
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
        <section className="categories">
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
        <div className="mobile-create">
          <button className="primary" onClick={() => open("task")}>
            {t("Создать задание ")}
            <Plus size={18} />
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
                  <TabsTrigger value="mine">{t("Мои ")}</TabsTrigger>
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
                  {user && <a className="outline" href="/privacy">{t('Мои данные')}</a>}
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
                      <AuthLogout/>
                    </>
                  )}
                </div>
              </div>
            )}
            {view==='mine' && records.filter(r=>r.kind==='notice'&&r.mine&&!hiddenDecisions.includes(r.id)).map(r=><div className="feedback" key={r.id}><div className="feedback-heading"><strong>{t('Решение по публикации')}</strong><button type="button" className="auth-link" onClick={()=>hideDecision(r.id)}>{t('Скрыть решение')}</button></div><p>{r.description}</p><p>{t('Основание')}: {r.basis}</p><p>{t('Решение принято человеком. Если вы не согласны, отправьте оператору номер обращения и обоснование пересмотра.')} {r.parent}</p><a href="mailto:igors.nikos@gmail.com">igors.nikos@gmail.com</a></div>)}
            {loading && <p role="status">{t("Загружаем данные\u2026 ")}</p>}
            <div className="cards">
              {items.map((item, i) => (
                <article className="card" key={item.id}>
                  <div className={"avatar color" + (i % 4)}>
                    {item.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
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
                      <strong>{item.price}</strong>
                      <button
                        aria-label={
                          t("Подробнее: ") + (item.title || item.name)
                        }
                        onClick={() => open("detail", item)}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                    {['task','profile'].includes(item.kind) && <ReportLink id={item.id}/>}
                  </div>
                </article>
              ))}
            </div>
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
        <span>{t("Услуги по всей Латвии ")}</span>
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
        <DialogContent className="market-dialog" showCloseButton={false}>
          <DialogClose className="dialog-close" aria-label={t("Закрыть")}>
            ×
          </DialogClose>
          <LanguageSwitcher />
          <DialogTitle>
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
                        : detail?.title || t("Ваше предложение")}
          </DialogTitle>
          <DialogDescription>
            {modal === "detail"
              ? t("Условия и подробности")
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
              {['task','profile','review'].includes(detail.kind) && <ReportLink id={detail.id}/>}
              <b>{detail.name}</b>
              <p>{detail.description}</p>
              <p>
                {t(detail.city)} · {detail.price}
              </p>
              {detail.kind === "profile" ? (
                <>
                  <h3>{t("Навыки ")}</h3>
                  <p>{detail.skills}</p>
                  <h3>{t("Портфолио ")}</h3>
                  {detail.portfolio ? (
                    detail.portfolio
                      .split("\n")
                      .filter(Boolean)
                      .map((link, i) => (
                        <a
                          className="portfolio-link"
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("Работа ")}
                          {i + 1} <ArrowUpRight size={16} />
                        </a>
                      ))
                  ) : (
                    <p>{t("Работы ещё не добавлены. ")}</p>
                  )}
                  <h3>
                    <Star size={18} /> {ratingText(detail.id)}
                  </h3>
                  {reviews(detail.id).map((r) => (
                    <div className="bid" key={r.id}>
                      <b>
                        {r.name} · {r.rating}/5
                      </b>
                      <p>{r.description}</p>
                    </div>
                  ))}
                  <button
                    className="primary"
                    onClick={() => open("task", detail)}
                  >
                    {t("Создать задание в этой категории ")}
                  </button>
                </>
              ) : detail.kind === "bid" ? (
                <>
                  <p>
                    {t("Статус: ")}{" "}
                    {taskFor(detail)?.chosen === detail.id
                      ? t("Вы выбраны исполнителем. ")
                      : ""}
                    {t(statusText(taskFor(detail)?.status))}
                  </p>
                  <button
                    className="primary"
                    onClick={() => open("chat", detail)}
                  >
                    <MessageCircle size={18} />
                    {t("Открыть чат с заказчиком ")}
                  </button>
                </>
              ) : (
                <>
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
                              {b.name} · {b.price}
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
                </>
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
                    {["task", "profile"].includes(modal) && (
                      <>
                        <label>
                          {modal === "profile"
                            ? t("Название услуги")
                            : t("Что нужно сделать?")}
                          <input
                            name="title"
                            required
                            maxLength={140}
                            defaultValue={
                              modal === "profile" ? selected?.title : ""
                            }
                            placeholder={t("Например, собрать шкаф")}
                          />
                        </label>
                        <Picker
                          label={t("Категория")}
                          value={formCategory}
                          onChange={setFormCategory}
                          values={[
                            ...categories.slice(1).map((c) => c[0]),
                            "Другое",
                          ]}
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
                        <label>
                          {t("Навыки ")}
                          <input
                            name="skills"
                            required
                            maxLength={500}
                            defaultValue={selected?.skills}
                            placeholder={t(
                              "Например: сборка мебели, электрика",
                            )}
                          />
                        </label>
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
                        defaultValue={
                          modal === "profile" ? selected?.description : ""
                        }
                      />
                    </label>
                    {!["chat", "review"].includes(modal) && (
                      <label>
                        {modal === "task"
                          ? t("Бюджет, EUR")
                          : t("Стоимость, EUR")}
                        <input
                          name="price"
                          required
                          maxLength={80}
                          placeholder={t(
                            "Например, 50 \u20AC или по договорённости",
                          )}
                          defaultValue={
                            modal === "profile" ? selected?.price : ""
                          }
                        />
                      </label>
                    )}
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
