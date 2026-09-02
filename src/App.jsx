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

// Componente Carta memoizado
const Carta = memo(function Carta({ carta, onClick }) {
    const bgPosition = `${carta.col * COLS_PERCENT}% ${carta.row * ROWS_PERCENT}%`;

    // Determinar clase según categoría
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

// Función para ordenar por categoría
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
    const [categoria, setCategoria] = useState("todos"); // 'todos', 'mayores', 'bastos', 'copas', 'espadas', 'oros'
    const [cartaId, setCartaId] = useState(null);

    // Sincronizar con hash de URL para la vista detalle
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

    // Filtrado combinado por texto y categoría, y ordenado
    const cartasFiltradas = useMemo(() => {
        let filtradas = cardsData;

        // Aplicar filtro por categoría
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

        // Aplicar búsqueda por texto
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

        // Ordenar por categoría para agrupar visualmente
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

    // Vista detalle
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
    let ultimoTipo = null; // 'mayor' o 'menor'
    let ultimoPalo = null;

    return (
        <div className="app">
            <header className="header">
                <h1>Cartas</h1>
            </header>

            <div className="searchbar-container">
                <svg
                    className="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#888"
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="search"
                    className="searchbar"
                    placeholder="Busque una carta..."
                    value={query}
                    onChange={handleBusqueda}
                    aria-label="Buscar cartas"
                />
            </div>

            {/* Filtros por categoría */}
            <div className="filtros-categoria">
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
                                encabezado = (
                                    <React.Fragment key={`sub-${carta.palo}`}>
                                        {encabezado}
                                        <h3 className="palo-titulo">
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
