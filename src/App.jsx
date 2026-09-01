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

// Componente Carta memoizado — no se re-renderiza si las props no cambian
const Carta = memo(function Carta({ carta, onClick }) {
    const bgPosition = `${carta.col * COLS_PERCENT}% ${carta.row * ROWS_PERCENT}%`;

    return (
        <div
            className="carta"
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

// Función para obtener carta por id
const getCartaById = (id) => cardsData.find((c) => c.id === id);

export default function App() {
    const [query, setQuery] = useState("");
    const [pagina, setPagina] = useState(1);
    const [cartaId, setCartaId] = useState(null); // null = lista, string = detalle

    // Sincronizar con el hash de la URL
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
        // Al cargar la página, verificar si hay hash
        handleHashChange();

        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    // Navegar a detalle
    const irADetalle = (id) => {
        window.location.hash = `#/carta/${id}`;
        setCartaId(id);
    };

    // Volver a la lista
    const volverALista = () => {
        window.location.hash = "";
        setCartaId(null);
    };

    // useDeferredValue para no bloquear el typing
    const deferredQuery = useDeferredValue(query);

    // Normalizar texto para búsqueda tolerante a tildes
    const normalizar = (texto) => {
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    // Filtrar cartas con useMemo
    const cartasFiltradas = useMemo(() => {
        if (!deferredQuery.trim()) return cardsData;

        const busqueda = normalizar(deferredQuery);

        return cardsData.filter((carta) => {
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
    }, [deferredQuery]);

    // Calcular paginación
    const totalPaginas = Math.ceil(cartasFiltradas.length / PAGE_SIZE);
    const paginaActual = Math.min(pagina, totalPaginas || 1);

    const cartasPaginadas = useMemo(() => {
        const inicio = (paginaActual - 1) * PAGE_SIZE;
        return cartasFiltradas.slice(inicio, inicio + PAGE_SIZE);
    }, [cartasFiltradas, paginaActual]);

    // Resetear a página 1 cuando cambia la búsqueda
    const handleBusqueda = (e) => {
        setQuery(e.target.value);
        setPagina(1);
    };

    // Generar números de página para el footer
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

    // Si estamos en vista detalle
    if (cartaId) {
        const carta = getCartaById(cartaId);
        if (!carta) {
            // Si no existe, volver a la lista
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

                    {/* Significado al derecho */}
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

                    {/* Significado invertido */}
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

            <main className="catalogo">
                {cartasPaginadas.length === 0 ? (
                    <p className="sin-resultados">No se encontraron cartas</p>
                ) : (
                    <div className="grid-cartas">
                        {cartasPaginadas.map((carta) => (
                            <Carta
                                key={carta.id}
                                carta={carta}
                                onClick={irADetalle}
                            />
                        ))}
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
