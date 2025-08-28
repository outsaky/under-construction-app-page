// src/App.jsx

import React from 'react'; // Vite lida com isso automaticamente
import { motion } from 'framer-motion'; // A importação correta!

// ===============================================
// CONFIGURAÇÕES GLOBAIS
// ===============================================
const SIZE = 4;
const SHUFFLE_MOVES = 30;
const SOLVE_SPEED = 300;
const THEME = { piece: "bg-indigo-500 hover:bg-indigo-600" };
const DAILY_IMAGES = {
    1: {
        // Os caminhos agora são relativos à pasta 'public'
        landscape: { full: '/assets/puzzle-images/image-01-landscape-full.webp', placeholder: '/assets/puzzle-images/image-01-landscape-placeholder.webp', ratio: '2400 / 1080' },
        standard:  { full: '/assets/puzzle-images/image-01-standard-full.webp',  placeholder: '/assets/puzzle-images/image-01-standard-placeholder.webp',  ratio: '1920 / 1080' },
        portrait:  { ratio: '1080 / 1350' }
    },
};

// ===============================================
// COMPONENTE DA PEÇA
// ===============================================
const PuzzlePiece = React.memo(({ val, onClick, image, placeholder, isLoaded, imageError, size }) => {
    const hasImage = image && val && !imageError;
    const style = hasImage ? { 
        backgroundImage: `url(${isLoaded ? image : placeholder})`, 
        backgroundSize: `${size * 100}% ${size * 100}%`, 
        backgroundPosition: `${((val - 1) % size) * -100}% ${Math.floor((val - 1) / size) * -100}%`,
    } : {};
    
    return ( 
        <motion.div 
            layout
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            onClick={onClick} 
            className={`flex items-center justify-center cursor-pointer select-none shadow-md rounded-md ${!val ? 'bg-gray-900/50' : ''} ${val && !hasImage ? THEME.piece : ''} ${hasImage ? (isLoaded ? 'opacity-100' : 'opacity-70 blur-sm') : ''}`}
            style={style}
        > 
            {val && !hasImage && (<span className="text-xl font-bold text-white drop-shadow-lg">{val}</span>)} 
        </motion.div> 
    );
});


// src/App.jsx

// ... (as linhas de import e o componente PuzzlePiece ficam aqui em cima)

function App() {
    // ===============================================
    // 1. HOOKS DE ESTADO
    // ===============================================
    const [board, setBoard] = React.useState([]);
    const [empty, setEmpty] = React.useState({ r: SIZE - 1, c: SIZE - 1 });
    const [history, setHistory] = React.useState([]);
    const [userMoves, setUserMoves] = React.useState([]);
    const [activeImageSet, setActiveImageSet] = React.useState(null);
    const [placeholder, setPlaceholder] = React.useState(null);
    const [fullImage, setFullImage] = React.useState(null);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);
    const [isPuzzleComplete, setIsPuzzleComplete] = React.useState(false);
    const [notification, setNotification] = React.useState('');
    const [isSolving, setIsSolving] = React.useState(false);
    const [solutionTriggeredByButton, setSolutionTriggeredByButton] = React.useState(false);

    // ===============================================
    // 2. FUNÇÕES AUXILIARES E DE LÓGICA (useCallback)
    // ===============================================
    const isSolved = (currentBoard) => { if (!currentBoard || currentBoard.length === 0) return false; let expectedVal = 1; for (let r = 0; r < SIZE; r++) { for (let c = 0; c < SIZE; c++) { if (r === SIZE - 1 && c === SIZE - 1) { if (currentBoard[r][c] !== null) return false; } else { if (currentBoard[r][c] !== expectedVal) return false; expectedVal++; } } } return true; };
    
    const shuffleBoard = React.useCallback(() => {
        setIsPuzzleComplete(false); 
        setSolutionTriggeredByButton(false);
        
        const solved = Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => (r === SIZE - 1 && c === SIZE - 1) ? null : r * SIZE + c + 1));
        
        let b = JSON.parse(JSON.stringify(solved)); 
        let e = { r: SIZE - 1, c: SIZE - 1 }; 
        let h = [];
        const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        
        // NOVO: Rastreia o último movimento para evitar desfazer a si mesmo.
        let lastMove = { dr: 0, dc: 0 };

        for (let i = 0; i < SHUFFLE_MOVES; i++) {
            // Filtra movimentos que saem do tabuleiro OU que são o exato oposto do último movimento.
            const possibleMoves = dirs.filter(({ dr, dc }) => {
                const nR = e.r + dr;
                const nC = e.c + dc;
                
                const isOutOfBounds = nR < 0 || nR >= SIZE || nC < 0 || nC >= SIZE;
                const isOppositeMove = dr === -lastMove.dr && dc === -lastMove.dc;

                return !isOutOfBounds && !isOppositeMove;
            });
            
            // Se o filtro resultar em nenhuma opção (raro, mas possível em cantos),
            // usa a lógica antiga apenas para este passo.
            const movePool = possibleMoves.length > 0 ? possibleMoves : dirs.filter(({ dr, dc }) => {
                const nR = e.r + dr, nC = e.c + dc;
                return nR >= 0 && nR < SIZE && nC >= 0 && nC < SIZE;
            });

            const move = movePool[Math.floor(Math.random() * movePool.length)];
            
            const nR = e.r + move.dr, nC = e.c + move.dc;
            h.push({ val: b[nR][nC], from: { r: nR, c: nC }, to: { r: e.r, c: e.c } });
            b[e.r][e.c] = b[nR][nC]; 
            b[nR][nC] = null; 
            e = { r: nR, c: nC };

            // NOVO: Lembra o último movimento que foi feito.
            lastMove = move;
        }
        
        setBoard(b); 
        setEmpty(e); 
        setHistory(h); 
        setUserMoves([]);
        }, []);
    
    const movePiece = React.useCallback((r, c) => { if (isSolving || isPuzzleComplete) return; const isValidMove = (Math.abs(r - empty.r) === 1 && c === empty.c) || (Math.abs(c - empty.c) === 1 && r === empty.r); if (isValidMove) { const val = board[r][c]; const newBoard = JSON.parse(JSON.stringify(board)); setUserMoves(prev => [...prev, { val, from: { r, c }, to: { r: empty.r, c: empty.c } }]); newBoard[empty.r][empty.c] = val; newBoard[r][c] = null; setBoard(newBoard); setEmpty({ r, c }); } }, [board, empty, isSolving, isPuzzleComplete]);
    
    const solvePuzzle = React.useCallback(async () => { setIsSolving(true); let b = JSON.parse(JSON.stringify(board)); let e = { ...empty }; const allMoves = [...userMoves].reverse().concat([...history].reverse()); for (const move of allMoves) { await new Promise(res => setTimeout(res, SOLVE_SPEED)); b[move.from.r][move.from.c] = move.val; b[move.to.r][move.to.c] = null; e = { r: move.to.r, c: move.to.c }; setBoard(JSON.parse(JSON.stringify(b))); setEmpty({ ...e }); } setUserMoves([]); setIsSolving(false); }, [board, empty, history, userMoves]);
    
    const handleSolveClick = () => { if (isPuzzleComplete) { setNotification('Está querendo me enganar? Já está tudo em ordem!'); setTimeout(() => setNotification(''), 3000); } else { setSolutionTriggeredByButton(true); solvePuzzle(); } };

    // ===============================================
    // 3. HOOKS DE EFEITO (useEffect)
    // ===============================================
    React.useEffect(() => { const selectImageSet = () => { const aspectRatio = window.innerWidth / window.innerHeight; const imageSets = DAILY_IMAGES[1]; if (aspectRatio > 1.8) setActiveImageSet(imageSets.landscape); else if (aspectRatio < 1.1) setActiveImageSet(imageSets.portrait); else setActiveImageSet(imageSets.standard); }; selectImageSet(); window.addEventListener('resize', selectImageSet); return () => window.removeEventListener('resize', selectImageSet); }, []);
    
    React.useEffect(() => { if (!activeImageSet || !activeImageSet.full) { setImageError(true); return; } setIsLoaded(false); setPlaceholder(null); setFullImage(null); setImageError(false); const pImg = new Image(); pImg.src = activeImageSet.placeholder; pImg.onload = () => { setPlaceholder(activeImageSet.placeholder); const fImg = new Image(); fImg.src = activeImageSet.full; fImg.onload = () => { setFullImage(activeImageSet.full); setTimeout(() => setIsLoaded(true), 100); }; fImg.onerror = () => { console.error("Falha ao carregar imagem principal."); setImageError(true); }; }; pImg.onerror = () => { console.error("Falha ao carregar imagem placeholder."); setImageError(true); }; }, [activeImageSet]);
    
    React.useEffect(() => { shuffleBoard(); }, [shuffleBoard, activeImageSet]);
    
    React.useEffect(() => { if (board.length > 0 && !isPuzzleComplete) { if (isSolved(board)) { setIsPuzzleComplete(true); setHistory([]); setUserMoves([]); if (solutionTriggeredByButton) { setNotification('Parabéns, você resolveu!... mesmo que seja apertando o botão 😉'); } else { setNotification('Parabéns, você resolveu!'); } setTimeout(() => setNotification(''), 4000); } } }, [board, isPuzzleComplete, solutionTriggeredByButton]);

    // ===============================================
    // 4. RENDERIZAÇÃO DO JSX
    // ===============================================
    const canSolve = placeholder || imageError;
    return (
        <main className="min-h-screen w-full bg-gray-900 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative">
            <div className="w-full max-w-[2400px] flex items-center justify-between mb-4 h-16 md:h-24">
                {fullImage && !imageError && (<img src={fullImage} alt="Preview" className="h-full w-auto rounded-md shadow-lg border-2 border-gray-600 transition-opacity duration-500" style={{ aspectRatio: activeImageSet?.ratio, opacity: isLoaded ? 1 : 0 }}/>)}
                <button onClick={isPuzzleComplete ? shuffleBoard : handleSolveClick} disabled={!canSolve && !isPuzzleComplete} className="text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg shadow-md transition-all w-48 text-center">
                    {isPuzzleComplete ? 'Embaralhar de Novo?' : (isSolving ? 'Resolvendo...' : 'Resolver')}
                </button>
            </div>
            <div className="w-full h-auto shadow-2xl" style={{ aspectRatio: activeImageSet?.ratio, maxWidth: '2400px', maxHeight: 'calc(100vh - 120px)' }}>
                {(placeholder || imageError) && (
                     <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-1 p-1 bg-gray-700/80 rounded-lg">
                        {board.flat().map((val, index) => {
                            const r = Math.floor(index / SIZE);
                            const c = index % SIZE;
                            return (<PuzzlePiece key={val === null ? 'empty' : val} val={val} onClick={() => movePiece(r, c)} image={fullImage} placeholder={placeholder} isLoaded={isLoaded} imageError={imageError} size={SIZE}/>);
                        })}
                    </div>
                )}
            </div>
            {notification && (<div className="fixed bottom-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-xl transition-opacity duration-300">{notification}</div>)}
        </main>
    );
}

export default App;






