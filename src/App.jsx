import React, {
    useState,
    useEffect,
    useMemo,
    useDeferredValue,
    memo,
} from "react";
import cardsData from "./assets/cards.json";

const PAGE_SIZE = 35;
const TOTAL_COLS = 13;
const TOTAL_ROWS = 6;
const COLS_PERCENT = 100 / (TOTAL_COLS - 1);
const ROWS_PERCENT = 100 / (TOTAL_ROWS - 1);

// Componente Carta memoizado (sin cambios)
const Carta = memo(function Carta({ carta, onClick }) {
    const bgPosition = `${carta.col * COLS_PERCENT}% ${carta.row * ROWS_PERCENT}%`;

    let categoriaClase = "carta-mayor";
    if (carta.arcano === "Menor") {
        switch (carta.palo) {
            case "Bastos":
                categoriaClase = "carta-bastos";
                break;
            case "Copas":
                categoriaClase = "carta-copas";
                break;
            case "Espadas":
                categoriaClase = "carta-espadas";
                break;
            case "Oros":
                categoriaClase = "carta-oros";
                break;
            default:
                categoriaClase = "carta-menor";
        }
    }

    return (
        <div
            className={`carta ${categoriaClase}`}
            onClick={() => onClick(carta.id)}
            role="button"
            tabIndex={0}
            aria-label={carta.nombre}
        >
            <div
                className="carta-imagen"
                style={{ backgroundPosition: bgPosition }}
                loading="lazy"
            />
        </div>
    );
});

const getCartaById = (id) => cardsData.find((c) => c.id === id);

const ordenCategoria = (carta) => {
    if (carta.arcano === "Mayor") return 0;
    switch (carta.palo) {
        case "Bastos":
            return 1;
        case "Copas":
            return 2;
        case "Espadas":
            return 3;
        case "Oros":
            return 4;
        default:
            return 5;
    }
};

export default function App() {
    const [query, setQuery] = useState("");
    const [pagina, setPagina] = useState(1);
    const [categoria, setCategoria] = useState("todos");
    const [cartaId, setCartaId] = useState(null);
    const [filtrosExpandidos, setFiltrosExpandidos] = useState(false); // Nuevo estado

    // Sincronizar con hash de URL (sin cambios)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith("#/carta/")) {
                const id = hash.replace("#/carta/", "");
                setCartaId(id);
            } else {
                setCartaId(null);
            }
        };
        window.addEventListener("hashchange", handleHashChange);
        handleHashChange();
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    const irADetalle = (id) => {
        window.location.hash = `#/carta/${id}`;
        setCartaId(id);
    };

    const volverALista = () => {
        window.location.hash = "";
        setCartaId(null);
    };

    const deferredQuery = useDeferredValue(query);

    const normalizar = (texto) => {
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    const cartasFiltradas = useMemo(() => {
        let filtradas = cardsData;

        if (categoria !== "todos") {
            if (categoria === "mayores") {
                filtradas = filtradas.filter((c) => c.arcano === "Mayor");
            } else {
                filtradas = filtradas.filter(
                    (c) =>
                        c.arcano === "Menor" &&
                        c.palo.toLowerCase() === categoria,
                );
            }
        }

        if (deferredQuery.trim()) {
            const busqueda = normalizar(deferredQuery);
            filtradas = filtradas.filter((carta) => {
                const nombre = normalizar(carta.nombre);
                const palo = carta.palo ? normalizar(carta.palo) : "";
                const arcano = normalizar(carta.arcano);
                const numero = carta.numero ? String(carta.numero) : "";
                return (
                    nombre.includes(busqueda) ||
                    palo.includes(busqueda) ||
                    arcano.includes(busqueda) ||
                    numero.includes(busqueda)
                );
            });
        }

        return filtradas.sort((a, b) => ordenCategoria(a) - ordenCategoria(b));
    }, [deferredQuery, categoria]);

    const totalPaginas = Math.ceil(cartasFiltradas.length / PAGE_SIZE);
    const paginaActual = Math.min(pagina, totalPaginas || 1);

    const cartasPaginadas = useMemo(() => {
        const inicio = (paginaActual - 1) * PAGE_SIZE;
        return cartasFiltradas.slice(inicio, inicio + PAGE_SIZE);
    }, [cartasFiltradas, paginaActual]);

    const handleBusqueda = (e) => {
        setQuery(e.target.value);
        setPagina(1);
    };

    const handleCategoria = (cat) => {
        setCategoria(cat);
        setPagina(1);
    };

    const numerosPagina = useMemo(() => {
        if (totalPaginas <= 1) return [];
        const paginas = [];
        const maxVisibles = 5;
        let inicio = Math.max(1, paginaActual - 2);
        let fin = Math.min(totalPaginas, inicio + maxVisibles - 1);
        if (fin - inicio < maxVisibles - 1) {
            inicio = Math.max(1, fin - maxVisibles + 1);
        }
        for (let i = inicio; i <= fin; i++) {
            paginas.push(i);
        }
        return paginas;
    }, [paginaActual, totalPaginas]);

    // Vista detalle (sin cambios)
    if (cartaId) {
        const carta = getCartaById(cartaId);
        if (!carta) {
            volverALista();
            return null;
        }
        const bgPosition = `${carta.col * COLS_PERCENT}% ${carta.row * ROWS_PERCENT}%`;
        const significados = carta.significados || {
            derecho: {},
            invertido: {},
        };

        return (
            <div className="app">
                <header className="header">
                    <button
                        className="header-back"
                        onClick={volverALista}
                        aria-label="Volver"
                    >
                        ←
                    </button>
                    <h1>Cartas</h1>
                </header>
                <main className="detalle-container">
                    <div className="detalle-carta">
                        <div
                            className="detalle-imagen"
                            style={{ backgroundPosition: bgPosition }}
                        />
                    </div>
                    <h2 className="detalle-nombre">{carta.nombre}</h2>
                    <p className="detalle-info">
                        {carta.arcano}
                        {carta.palo ? ` · ${carta.palo}` : ""}
                        {carta.numero ? ` · Número ${carta.numero}` : ""}
                    </p>

                    <div className="significado-bloque">
                        <h3 className="significado-titulo">Al derecho</h3>
                        {Object.entries(significados.derecho || {}).map(
                            ([clave, texto]) => (
                                <div key={clave} className="significado-item">
                                    <h4 className="significado-subtitulo">
                                        {clave}
                                    </h4>
                                    <p className="significado-texto">
                                        {texto || "Información no disponible."}
                                    </p>
                                </div>
                            ),
                        )}
                    </div>

                    <div className="significado-bloque invertido">
                        <h3 className="significado-titulo">Invertida</h3>
                        {Object.entries(significados.invertido || {}).map(
                            ([clave, texto]) => (
                                <div key={clave} className="significado-item">
                                    <h4 className="significado-subtitulo">
                                        {clave}
                                    </h4>
                                    <p className="significado-texto">
                                        {texto || "Información no disponible."}
                                    </p>
                                </div>
                            ),
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // Vista lista
    let ultimoTipo = null;
    let ultimoPalo = null;

    return (
        <div className="app">
            <header className="header">
                <h1>Inkebrantable</h1>
            </header>

            <img
                src="/decoraciones/pink-spots.png"
                alt="Manchas de pintura"
                className="paint-splatter"
            />

            <div className="searchbar-container">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 430 430"
                    fill="none"
                    className="search-icon star-icon"
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
                    value={query}
                    onChange={handleBusqueda}
                    aria-label="Buscar cartas"
                />
            </div>

            {/* Filtros por categoría con toggle */}
            <div className="filtros-contenedor">
                <div
                    className={`filtros-lista ${
                        filtrosExpandidos ? "expandido" : "colapsado"
                    }`}
                >
                    <button
                        className={`filtro-btn ${categoria === "todos" ? "activo" : ""}`}
                        onClick={() => handleCategoria("todos")}
                    >
                        Todas
                    </button>
                    <button
                        className={`filtro-btn ${categoria === "mayores" ? "activo" : ""}`}
                        onClick={() => handleCategoria("mayores")}
                    >
                        Arcanos Mayores
                    </button>
                    <button
                        className={`filtro-btn ${categoria === "bastos" ? "activo" : ""}`}
                        onClick={() => handleCategoria("bastos")}
                    >
                        Bastos
                    </button>
                    <button
                        className={`filtro-btn ${categoria === "copas" ? "activo" : ""}`}
                        onClick={() => handleCategoria("copas")}
                    >
                        Copas
                    </button>
                    <button
                        className={`filtro-btn ${categoria === "espadas" ? "activo" : ""}`}
                        onClick={() => handleCategoria("espadas")}
                    >
                        Espadas
                    </button>
                    <button
                        className={`filtro-btn ${categoria === "oros" ? "activo" : ""}`}
                        onClick={() => handleCategoria("oros")}
                    >
                        Oros
                    </button>
                </div>

                <button
                    className="filtro-toggle"
                    onClick={() => setFiltrosExpandidos((v) => !v)}
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
                        alt={
                            filtrosExpandidos
                                ? "Colapsar filtros"
                                : "Expandir filtros"
                        }
                        className={`filtro-toggle-img ${
                            filtrosExpandidos ? "rotada-izquierda" : ""
                        }`}
                    />
                </button>
            </div>

            <main className="catalogo">
                {cartasPaginadas.length === 0 ? (
                    <p className="sin-resultados">No se encontraron cartas</p>
                ) : (
                    <div className="grid-cartas">
                        {cartasPaginadas.map((carta, index) => {
                            const tipo =
                                carta.arcano === "Mayor" ? "mayor" : "menor";
                            let encabezado = null;

                            if (index === 0 || tipo !== ultimoTipo) {
                                const esPrimerMenor =
                                    carta.arcano === "Menor" &&
                                    ultimoTipo === "mayor";
                                encabezado = (
                                    <h2
                                        key={`encabezado-${tipo}`}
                                        className={`categoria-titulo ${esPrimerMenor ? "primer-menor" : ""}`}
                                    >
                                        {carta.arcano === "Mayor"
                                            ? "Arcanos Mayores"
                                            : "Arcanos Menores"}
                                    </h2>
                                );
                                ultimoTipo = tipo;
                                ultimoPalo = null;
                            }

                            if (tipo === "menor" && carta.palo !== ultimoPalo) {
                                const esPrimerPalo = ultimoPalo === null;
                                encabezado = (
                                    <React.Fragment key={`sub-${carta.palo}`}>
                                        {encabezado}
                                        <h3
                                            className={`palo-titulo ${esPrimerPalo ? "primer-palo" : ""}`}
                                        >
                                            {carta.palo}
                                        </h3>
                                    </React.Fragment>
                                );
                                ultimoPalo = carta.palo;
                            }

                            return (
                                <React.Fragment key={carta.id}>
                                    {encabezado}
                                    <Carta carta={carta} onClick={irADetalle} />
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </main>

            {totalPaginas > 1 && (
                <footer className="paginacion">
                    <button
                        className="pag-btn"
                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                        aria-label="Página anterior"
                    >
                        ←
                    </button>

                    {numerosPagina.map((num) => (
                        <button
                            key={num}
                            className={`pag-num ${num === paginaActual ? "activo" : ""}`}
                            onClick={() => setPagina(num)}
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        className="pag-btn"
                        onClick={() =>
                            setPagina((p) => Math.min(totalPaginas, p + 1))
                        }
                        disabled={paginaActual === totalPaginas}
                        aria-label="Página siguiente"
                    >
                        →
                    </button>
                </footer>
            )}
        </div>
    );
}
