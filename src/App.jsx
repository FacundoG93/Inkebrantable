import React, {
    useState,
    useEffect,
    useMemo,
    useDeferredValue,
    useCallback,
    memo,
    Fragment,
} from "react";
import cardsData from "./assets/cards.json";

/* ============ CONSTANTES ============ */
const PAGE_SIZE = 36;
const TOTAL_COLS = 13;
const TOTAL_ROWS = 6;
const COLS_PERCENT = 100 / (TOTAL_COLS - 1);
const ROWS_PERCENT = 100 / (TOTAL_ROWS - 1);
const MAX_PAGINAS_VISIBLES = 5;

const FILTROS = [
    { id: "todos", label: "Todas" },
    { id: "mayores", label: "Arcanos Mayores" },
    { id: "bastos", label: "Bastos" },
    { id: "copas", label: "Copas" },
    { id: "espadas", label: "Espadas" },
    { id: "oros", label: "Oros" },
];

const CATEGORIA_CLASE = {
    Bastos: "carta-bastos",
    Copas: "carta-copas",
    Espadas: "carta-espadas",
    Oros: "carta-oros",
};

const ORDEN_CATEGORIA = {
    Bastos: 1,
    Copas: 2,
    Espadas: 3,
    Oros: 4,
};

/* ============ HELPERS PUROS ============ */
const normalizar = (texto) =>
    texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const getBgPosition = (carta) =>
    `${carta.col * COLS_PERCENT}% ${carta.row * ROWS_PERCENT}%`;

const getCategoriaClase = (carta) => {
    if (carta.arcano === "Mayor") return "carta-mayor";
    return CATEGORIA_CLASE[carta.palo] || "carta-menor";
};

const ordenCategoria = (carta) => {
    if (carta.arcano === "Mayor") return 0;
    return ORDEN_CATEGORIA[carta.palo] ?? 5;
};

const getCartaById = (id) => cardsData.find((c) => c.id === id);

/**
 * Convierte la lista plana de cartas en una lista de items a renderizar,
 * intercalando encabezados de categoría (Arcanos Mayores/Menores) y palo.
 * Evita mutar variables durante el render (anti-patrón de React).
 */
const construirListaRender = (cartas) => {
    const items = [];
    let ultimoTipo = null;
    let ultimoPalo = null;

    for (const carta of cartas) {
        const tipo = carta.arcano === "Mayor" ? "mayor" : "menor";

        if (tipo !== ultimoTipo) {
            items.push({
                kind: "categoria",
                key: `cat-${tipo}`,
                titulo:
                    carta.arcano === "Mayor"
                        ? "Arcanos Mayores"
                        : "Arcanos Menores",
                esPrimerMenor:
                    carta.arcano === "Menor" && ultimoTipo === "mayor",
            });
            ultimoTipo = tipo;
            ultimoPalo = null;
        }

        if (tipo === "menor" && carta.palo !== ultimoPalo) {
            items.push({
                kind: "palo",
                key: `palo-${carta.palo}`,
                titulo: carta.palo,
                esPrimerPalo: ultimoPalo === null,
            });
            ultimoPalo = carta.palo;
        }

        items.push({ kind: "carta", key: carta.id, carta });
    }

    return items;
};

/* ============ COMPONENTES ============ */

const Carta = memo(function Carta({ carta, onClick }) {
    return (
        <button
            type="button"
            className={`carta ${getCategoriaClase(carta)}`}
            onClick={() => onClick(carta.id)}
            aria-label={`Ver detalle de ${carta.nombre}`}
        >
            <span
                className="carta-imagen"
                style={{ backgroundPosition: getBgPosition(carta) }}
                aria-hidden="true"
            />
        </button>
    );
});

function SignificadoBloque({ titulo, significados, invertido = false }) {
    const entries = Object.entries(significados || {});
    const idTitulo = `significado-${invertido ? "invertido" : "derecho"}`;

    return (
        <section
            className={`significado-bloque${invertido ? " invertido" : ""}`}
            aria-labelledby={idTitulo}
        >
            <h3 id={idTitulo} className="significado-titulo">
                {titulo}
            </h3>
            <dl className="significado-lista">
                {entries.map(([clave, texto]) => (
                    <Fragment key={clave}>
                        <dt className="significado-subtitulo">{clave}</dt>
                        <dd className="significado-texto">
                            {texto || "Información no disponible."}
                        </dd>
                    </Fragment>
                ))}
            </dl>
        </section>
    );
}

function DetalleView({ carta, onVolver }) {
    const significados = carta.significados || {
        derecho: {},
        invertido: {},
    };

    return (
        <section className="app">
            <header className="header">
                <button
                    type="button"
                    className="header-back"
                    onClick={onVolver}
                    aria-label="Volver al catálogo"
                >
                    <img
                        src="/decoraciones/silver-arrow.png"
                        alt=""
                        aria-hidden="true"
                        className="pag-arrow left"
                    />
                </button>
                <h1>Inkebrantable</h1>
            </header>

            <main className="detalle-container">
                <figure className="detalle-ficha">
                    <div className="detalle-marco">
                        <div
                            className="detalle-imagen"
                            style={{
                                backgroundPosition: getBgPosition(carta),
                            }}
                            aria-hidden="true"
                        />
                    </div>
                    <figcaption className="detalle-pie">
                        <h2 className="detalle-nombre">{carta.nombre}</h2>
                        <ul className="detalle-tags">
                            <li className="detalle-tag">{carta.arcano}</li>
                            {carta.palo != null && (
                                <li className="detalle-tag">{carta.palo}</li>
                            )}
                            {carta.arcano === "Menor" &&
                                carta.numero != null && (
                                    <li className="detalle-tag">
                                        N.º {carta.numero}
                                    </li>
                                )}
                        </ul>
                    </figcaption>
                </figure>

                <div className="significados-grid">
                    <SignificadoBloque
                        titulo="Al derecho"
                        significados={significados.derecho}
                    />
                    <SignificadoBloque
                        titulo="Invertida"
                        significados={significados.invertido}
                        invertido
                    />
                </div>
            </main>
        </section>
    );
}

/* ============ COMPONENTE PRINCIPAL ============ */
export default function App() {
    const [query, setQuery] = useState("");
    const [pagina, setPagina] = useState(1);
    const [categoria, setCategoria] = useState("todos");
    const [cartaId, setCartaId] = useState(null);
    const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

    /* --- Router por hash --- */
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith("#/carta/")) {
                const id = hash.replace("#/carta/", "");
                if (getCartaById(id)) {
                    setCartaId(id);
                } else {
                    window.location.hash = "";
                    return;
                }
            } else {
                setCartaId(null);
            }
            window.scrollTo(0, 0);
        };

        window.addEventListener("hashchange", handleHashChange);
        handleHashChange();
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    /* --- Handlers memoizados (para no romper el memo de Carta) --- */
    const irADetalle = useCallback((id) => {
        window.location.hash = `#/carta/${id}`;
    }, []);

    const volverALista = useCallback(() => {
        window.location.hash = "";
    }, []);

    const handleBusqueda = useCallback((e) => {
        setQuery(e.target.value);
        setPagina(1);
        window.scrollTo(0, 0);
    }, []);

    const handleCategoria = useCallback((cat) => {
        setCategoria(cat);
        setPagina(1);
        window.scrollTo(0, 0);
    }, []);

    const handlePagina = useCallback((num) => {
        setPagina(num);
        window.scrollTo(0, 0);
    }, []);

    /* --- Filtrado --- */
    const deferredQuery = useDeferredValue(query);

    const cartasFiltradas = useMemo(() => {
        let filtradas = cardsData;

        if (categoria === "mayores") {
            filtradas = filtradas.filter((c) => c.arcano === "Mayor");
        } else if (categoria !== "todos") {
            filtradas = filtradas.filter(
                (c) =>
                    c.arcano === "Menor" && c.palo.toLowerCase() === categoria,
            );
        }

        const q = deferredQuery.trim();
        if (q) {
            const busqueda = normalizar(q);
            filtradas = filtradas.filter((carta) => {
                return (
                    normalizar(carta.nombre).includes(busqueda) ||
                    normalizar(carta.palo ?? "").includes(busqueda) ||
                    normalizar(carta.arcano).includes(busqueda) ||
                    String(carta.numero ?? "").includes(busqueda)
                );
            });
        }

        return [...filtradas].sort(
            (a, b) => ordenCategoria(a) - ordenCategoria(b),
        );
    }, [deferredQuery, categoria]);

    const totalPaginas = Math.ceil(cartasFiltradas.length / PAGE_SIZE);
    const paginaActual = Math.min(pagina, totalPaginas || 1);

    const cartasPaginadas = useMemo(() => {
        const inicio = (paginaActual - 1) * PAGE_SIZE;
        return cartasFiltradas.slice(inicio, inicio + PAGE_SIZE);
    }, [cartasFiltradas, paginaActual]);

    const itemsRender = useMemo(
        () => construirListaRender(cartasPaginadas),
        [cartasPaginadas],
    );

    const numerosPagina = useMemo(() => {
        if (totalPaginas <= 1) return [];
        const paginas = [];
        let inicio = Math.max(1, paginaActual - 2);
        let fin = Math.min(totalPaginas, inicio + MAX_PAGINAS_VISIBLES - 1);
        if (fin - inicio < MAX_PAGINAS_VISIBLES - 1) {
            inicio = Math.max(1, fin - MAX_PAGINAS_VISIBLES + 1);
        }
        for (let i = inicio; i <= fin; i++) paginas.push(i);
        return paginas;
    }, [paginaActual, totalPaginas]);

    /* --- Vista detalle --- */
    if (cartaId) {
        const carta = getCartaById(cartaId);
        if (carta) {
            return <DetalleView carta={carta} onVolver={volverALista} />;
        }
    }

    /* --- Vista lista --- */
    return (
        <section className="app">
            <header className="header">
                <h1>Inkebrantable</h1>
            </header>

            <img
                src="/decoraciones/pink-spots.png"
                alt=""
                aria-hidden="true"
                className="paint-splatter"
            />

            {/* --- Buscador --- */}
            <search className="searchbar-container">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 430 430"
                    fill="none"
                    className="search-icon star-icon"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        stroke="currentColor"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                        strokeMiterlimit="15.2"
                        strokeWidth="24"
                        d="m219.054 48.3 38.9 119.9c.6 2 2.5 3.3 4.5 3.3h126.1c4.6 0 6.5 5.9 2.8 8.6l-50.3 36.6-51.6 37.5c-1.7 1.2-2.4 3.4-1.7 5.3l14.7 45.3 24.2 74.6c1.4 4.4-3.6 8-7.3 5.3l-47.6-34.6-54.3-39.5c-1.7-1.2-3.9-1.2-5.6 0l-48.5 35.3-53.4 38.8c-3.7 2.7-8.8-.9-7.3-5.3l22.2-68.2 16.8-51.7c.6-2-.1-4.1-1.7-5.3l-52.8-38.4-49.2-35.7c-3.7-2.7-1.8-8.6 2.8-8.6h125.8c2.1 0 3.9-1.3 4.5-3.3l39-119.9c1.4-4.4 7.6-4.4 9 0"
                    />
                </svg>
                <input
                    type="search"
                    className="searchbar"
                    placeholder="Buscar carta..."
                    aria-label="Buscar cartas"
                    value={query}
                    onChange={handleBusqueda}
                    autoComplete="off"
                />
            </search>

            {/* --- Filtros (lista de botones) --- */}
            <nav
                className="filtros-contenedor"
                aria-label="Filtros por categoría"
            >
                <ul
                    id="lista-filtros"
                    className={`filtros-lista ${
                        filtrosExpandidos ? "expandido" : "colapsado"
                    }`}
                >
                    {FILTROS.map(({ id, label }) => (
                        <li key={id}>
                            <button
                                type="button"
                                className={`filtro-btn ${
                                    categoria === id ? "activo" : ""
                                }`}
                                onClick={() => handleCategoria(id)}
                                aria-pressed={categoria === id}
                            >
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>

                <button
                    type="button"
                    className="filtro-toggle"
                    onClick={() => setFiltrosExpandidos((v) => !v)}
                    aria-expanded={filtrosExpandidos}
                    aria-controls="lista-filtros"
                    aria-label={
                        filtrosExpandidos
                            ? "Colapsar filtros"
                            : "Expandir filtros"
                    }
                >
                    <img
                        src={
                            filtrosExpandidos
                                ? "/decoraciones/Tim-star(white).png"
                                : "/decoraciones/Tim-star(grey).png"
                        }
                        alt=""
                        aria-hidden="true"
                        className={`filtro-toggle-img ${
                            filtrosExpandidos ? "rotada-izquierda" : ""
                        }`}
                    />
                </button>
            </nav>

            {/* El <main> es el grid: los títulos ocupan toda la fila. */}
            <main className="catalogo">
                {itemsRender.length === 0 ? (
                    <p className="sin-resultados">No se encontraron cartas</p>
                ) : (
                    itemsRender.map((item) => {
                        if (item.kind === "categoria") {
                            return (
                                <h2
                                    key={item.key}
                                    className={`categoria-titulo ${
                                        item.esPrimerMenor ? "primer-menor" : ""
                                    }`}
                                >
                                    {item.titulo}
                                </h2>
                            );
                        }
                        if (item.kind === "palo") {
                            return (
                                <h3
                                    key={item.key}
                                    className={`palo-titulo ${
                                        item.esPrimerPalo ? "primer-palo" : ""
                                    }`}
                                >
                                    {item.titulo}
                                </h3>
                            );
                        }
                        return (
                            <Carta
                                key={item.key}
                                carta={item.carta}
                                onClick={irADetalle}
                            />
                        );
                    })
                )}
            </main>

            {totalPaginas > 1 && (
                <footer className="paginacion">
                    <button
                        type="button"
                        className="pag-btn"
                        onClick={() =>
                            handlePagina(Math.max(1, paginaActual - 1))
                        }
                        disabled={paginaActual === 1}
                        aria-label="Página anterior"
                    >
                        <img
                            src="/decoraciones/silver-arrow.png"
                            alt=""
                            aria-hidden="true"
                            className="pag-arrow left"
                        />
                    </button>

                    {numerosPagina.map((num) => (
                        <button
                            key={num}
                            type="button"
                            className={`pag-num ${
                                num === paginaActual ? "activo" : ""
                            }`}
                            onClick={() => handlePagina(num)}
                            aria-current={
                                num === paginaActual ? "page" : undefined
                            }
                            aria-label={`Ir a página ${num}`}
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        type="button"
                        className="pag-btn"
                        onClick={() =>
                            handlePagina(
                                Math.min(totalPaginas, paginaActual + 1),
                            )
                        }
                        disabled={paginaActual === totalPaginas}
                        aria-label="Página siguiente"
                    >
                        <img
                            src="/decoraciones/silver-arrow.png"
                            alt=""
                            aria-hidden="true"
                            className="pag-arrow right"
                        />
                    </button>
                </footer>
            )}
        </section>
    );
}
