import React, { useState, useEffect, useMemo, useRef } from 'react'; 
import { Search, Coins, ArrowRight, TrendingUp, AlertTriangle, Clipboard, X } from 'lucide-react';
import { createChart } from 'lightweight-charts'; 

// Komponen Spinner untuk loading state
const Spinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2">
        <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-cyan-300">Memuat data...</p>
    </div>
);

// Helper function to identify DEXs by name
const isDEX = (exchangeName) => {
    const dexKeywords = ['uniswap', 'pancakeswap', 'sushiswap', 'quickswap', 'trader joe', 'raydium', 'serum', 'curve', 'spookyswap', 'camelot', 'arbitrum', 'balancer'];
    const lowerCaseName = exchangeName.toLowerCase();
    return dexKeywords.some(keyword => lowerCaseName.includes(keyword));
};

// Helper function to clean DEX names from long addresses or extra info
const cleanDexName = (exchangeName) => {
    let cleaned = exchangeName
        .replace(/\s*0x[0-9a-fA-F]{40}\s*/g, '') 
        .replace(/\(V[0-9]+\)/g, '') 
        .replace(/\(Polygon\)/g, '') 
        .replace(/\(BSC\)/g, '') 
        .replace(/\(Ethereum\)/g, '') 
        .replace(/\(Arbitrum\)/g, '') 
        .replace(/pool/gi, '') 
        .replace(/exchange/gi, '') 
        .replace(/version/gi, '') 
        .trim();
    
    cleaned = cleaned.replace(/[-.\s]+$/, '');

    if (cleaned.length < 3) return exchangeName; 

    return cleaned;
};

// Helper function to minimize contract addresses (for display only)
const minimizeAddress = (address) => {
    if (!address) return '';
    if (address.length <= 12) return address; 
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Generic placeholder for missing images (data URI for a simple circle)
const genericPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='gray'%3E%3Ccircle cx='10' cy='10' r='8'/%3E%3C/svg%3E";

// Daftar bursa yang tersedia untuk simulasi (bisa ditambahkan nanti dari API)
const availableExchanges = [
    { id: 'binance', name: 'Binance', fee: 0.1 },
    { id: 'coinbase', name: 'Coinbase', fee: 0.5 },
    { id: 'kraken', name: 'Kraken', fee: 0.2 },
    { id: 'bybit', name: 'Bybit', fee: 0.075 },
    { id: 'pionex', name: 'Pionex', fee: 0.05 }, // Contoh Pionex
    { id: 'uniswap', name: 'Uniswap (DEX)', fee: 0.3 },
    { id: 'pancakeswap', name: 'PancakeSwap (DEX)', fee: 0.25 },
];


export default function App() {
    const [currentView, setCurrentView] = useState('search'); // 'search' atau 'simulate'

    // State untuk Search View
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // State untuk Modal Detail Koin
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCoinId, setSelectedCoinId] = useState(null);
    const [selectedCoinDetails, setSelectedCoinDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(null);
    const chartContainerRef = useRef();

    // State untuk Simulasi View
    const [simInvestment, setSimInvestment] = useState('100'); // Default value
    const [simBuyPrice, setSimBuyPrice] = useState('0.50');
    const [simSellPrice, setSimSellPrice] = useState('0.51');
    const [simBuyExchange, setSimBuyExchange] = useState('binance');
    const [simSellExchange, setSimSellExchange] = useState('pionex');
    const [simBuyFee, setSimBuyFee] = useState(''); // Akan diisi dari selected exchange
    const [simSellFee, setSimSellFee] = useState(''); // Akan diisi dari selected exchange
    const [simResult, setSimResult] = useState(null);

    // useEffect untuk mengupdate fee saat bursa dipilih
    useEffect(() => {
        const buyEx = availableExchanges.find(ex => ex.id === simBuyExchange);
        const sellEx = availableExchanges.find(ex => ex.id === simSellExchange);
        setSimBuyFee(buyEx ? buyEx.fee.toString() : '0.1');
        setSimSellFee(sellEx ? sellEx.fee.toString() : '0.1');
    }, [simBuyExchange, simSellExchange]);


    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm) {
            setError('Silakan masukkan nama atau simbol token.');
            return;
        }
        
        setLoading(true);
        setError(null);
        setSearchResults([]);

        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${searchTerm}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gagal mencari token. Status: ${response.status} - ${errorText.substring(0, 100)}...`);
            }
            const data = await response.json();

            if (!data.coins || data.coins.length === 0) {
                setError(`Token "${searchTerm}" tidak ditemukan.`);
                return;
            }
            const filteredCoins = data.coins.filter(coin => coin.id); 
            setSearchResults(filteredCoins);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fungsi untuk membuka modal dan mengambil detail koin
    const openCoinModal = async (coinId) => {
        setSelectedCoinId(coinId);
        setIsModalOpen(true);
        setModalLoading(true);
        setModalError(null);
        setSelectedCoinDetails(null);

        try {
            const detailsResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=true&community_data=false&developer_data=false&sparkline=false`);
            if (!detailsResponse.ok) {
                const errorText = await detailsResponse.text();
                throw new Error(`Gagal memuat detail koin: ${detailsResponse.status} - ${errorText.substring(0, 100)}...`);
            }
            const detailsData = await detailsResponse.json();
            setSelectedCoinDetails(detailsData);
            
        } catch (err) {
            setModalError(err.message);
        } finally {
            setModalLoading(false);
        }
    };

    const closeCoinModal = () => {
        setIsModalOpen(false);
        setSelectedCoinId(null);
        setSelectedCoinDetails(null);
        setModalError(null);
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Contract address berhasil disalin!');
        } catch (err) {
            alert('Gagal menyalin contract address.');
            console.error('Failed to copy: ', err);
        }
    };

    // useEffect untuk inisialisasi dan update chart
    useEffect(() => {
        if (selectedCoinDetails && selectedCoinId && chartContainerRef.current) {
            const fetchChartData = async () => {
                try {
                    // Ambil data OHLC untuk grafik candlestick (7 hari)
                    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoinId}/ohlc?vs_currency=usd&days=7`); // Ubah days sesuai kebutuhan
                    if (!response.ok) throw new Error('Gagal memuat data grafik OHLC.');
                    const data = await response.json();

                    if (!data || data.length === 0) {
                        chartContainerRef.current.innerHTML = `<p class="text-center text-gray-500 py-4">Data grafik tidak tersedia.</p>`;
                        return;
                    }

                    // Format data untuk lightweight-charts candlestick
                    const candlestickData = data.map(item => ({
                        time: item[0] / 1000, // Waktu dalam detik
                        open: item[1],
                        high: item[2],
                        low: item[3],
                        close: item[4],
                    }));

                    // Bersihkan chart lama jika ada
                    chartContainerRef.current.innerHTML = ''; 
                    const chart = createChart(chartContainerRef.current, {
                        width: chartContainerRef.current.clientWidth,
                        height: 300,
                        layout: {
                            backgroundColor: '#1a202c', // Warna latar belakang chart (dark)
                            textColor: '#d1d4db', // Warna teks (light)
                        },
                        grid: {
                            vertLines: { color: '#2d3748' }, // Garis grid vertikal
                            horzLines: { color: '#2d3748' }, // Garis grid horizontal
                        },
                        timeScale: {
                            timeVisible: true,
                            secondsVisible: false,
                        },
                        crosshair: {
                            mode: 0, 
                        },
                    });

                    // Tambahkan candlestick series
                    const candlestickSeries = chart.addCandlestickSeries({
                        upColor: '#26a69a',   // Warna candlestick naik
                        downColor: '#ef5350', // Warna candlestick turun
                        borderVisible: false,
                        wickColor: '#ffffff', // Warna sumbu candlestick
                        wickUpColor: '#26a69a',
                        wickDownColor: '#ef5350',
                    });
                    candlestickSeries.setData(candlestickData);

                    const resizeHandler = () => {
                        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                    };
                    window.addEventListener('resize', resizeHandler);

                    return () => {
                        window.removeEventListener('resize', resizeHandler);
                        chart.remove(); 
                    };

                } catch (err) {
                    console.error("Error loading chart data:", err);
                    chartContainerRef.current.innerHTML = `<p class="text-center text-red-500">Gagal memuat grafik: ${err.message}</p>`;
                }
            };

            fetchChartData();
        }
    }, [selectedCoinDetails, selectedCoinId, isModalOpen]); 


    // Fungsi untuk menghitung simulasi
    const calculateSimulation = (e) => {
        e.preventDefault();
        const investment = parseFloat(simInvestment);
        const buyPrice = parseFloat(simBuyPrice);
        const sellPrice = parseFloat(simSellPrice);
        const buyFee = parseFloat(simBuyFee) / 100; // Ubah ke desimal
        const sellFee = parseFloat(simSellFee) / 100; // Ubah ke desimal

        if (isNaN(investment) || isNaN(buyPrice) || isNaN(sellPrice) || investment <= 0 || buyPrice <= 0 || sellPrice <= 0) {
            setSimResult({ error: 'Mohon masukkan angka valid untuk semua input.' });
            return;
        }

        const amountBought = investment / buyPrice;
        const buyCostWithFee = investment + (investment * buyFee); // Total biaya beli termasuk fee
        
        const amountSold = amountBought; // Asumsi jual semua yang dibeli
        const revenueBeforeFee = amountSold * sellPrice;
        const netRevenue = revenueBeforeFee - (revenueBeforeFee * sellFee); // Pendapatan bersih setelah fee jual

        const grossProfit = netRevenue - buyCostWithFee;
        const roi = (grossProfit / buyCostWithFee) * 100;

        setSimResult({
            grossProfit: grossProfit,
            roi: roi,
            amountBought: amountBought,
            buyCostWithFee: buyCostWithFee,
            netRevenue: netRevenue
        });
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Aplikasi */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Coins className="w-10 h-10 text-cyan-400" />
                        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Pencarian Token Kripto</h1>
                    </div>
                    <p className="text-gray-400 text-md">Cari token berdasarkan nama atau simbol.</p>
                </div>

                {/* Navigasi Utama (Dashboard 1) */}
                <div className="flex justify-center mb-6 border-b border-gray-700">
                    <button 
                        onClick={() => setCurrentView('search')} 
                        className={`px-4 py-2 text-lg font-semibold ${currentView === 'search' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                    >
                        Pencarian
                    </button>
                    <button 
                        onClick={() => setCurrentView('simulate')} 
                        className={`ml-4 px-4 py-2 text-lg font-semibold ${currentView === 'simulate' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                    >
                        Simulasi Profit
                    </button>
                    {/* Di sini nanti bisa ditambahkan tab untuk Dashboard 1: Overview */}
                </div>

                {/* Tampilan berdasarkan currentView */}
                {currentView === 'search' && (
                    <div className="space-y-6">
                        {/* Form Pencarian */}
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-8">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Contoh: Bitcoin, ETH, atau UNI..."
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-white"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            </div>
                            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                                {loading ? 'Mencari...' : 'Cari Token'}
                            </button>
                        </form>

                        {/* Hasil Pencarian */}
                        {loading && <Spinner />}
                        {error && (
                            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
                               <AlertTriangle className="w-6 h-6"/>
                               <span>{error}</span>
                            </div>
                        )}
                        {searchResults.length > 0 && !loading && !error && (
                            <div className="bg-gray-800/50 rounded-lg p-1 sm:p-2">
                                <h3 className="text-xl font-bold text-white p-4">Hasil Pencarian</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="border-b border-gray-700">
                                            <tr>
                                                <th className="text-left p-3 font-semibold text-gray-400">Nama</th>
                                                <th className="text-left p-3 font-semibold text-gray-400">Simbol</th>
                                                <th className="text-right p-3 font-semibold text-gray-400">Peringkat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map((coin) => (
                                                <tr key={coin.id} className="border-t border-gray-700/50 hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => openCoinModal(coin.id)}>
                                                    <td className="p-3 flex items-center gap-2">
                                                        <img src={coin.thumb} alt={coin.name} className="w-5 h-5 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src=genericPlaceholder; }}/>
                                                        <span className="font-medium text-white">{coin.name}</span>
                                                    </td>
                                                    <td className="p-3 font-mono text-gray-400">{coin.symbol?.toUpperCase()}</td>
                                                    <td className="p-3 text-right text-white">{coin.market_cap_rank || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {searchResults.length === 0 && !loading && !error && searchTerm && (
                             <p className="text-center text-gray-500">Tidak ada hasil untuk "{searchTerm}".</p>
                        )}
                         {searchResults.length === 0 && !loading && !error && !searchTerm && (
                             <p className="text-center text-gray-500">Mulai mencari token untuk melihat hasilnya.</p>
                        )}

                    </div>
                )}

                {/* Tampilan Simulasi Profit (Dashboard 3) */}
                {currentView === 'simulate' && (
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Simulasi Profit Arbitrase</h2>
                        <form onSubmit={calculateSimulation} className="space-y-4">
                            <div>
                                <label htmlFor="investment" className="block text-gray-400 text-sm font-bold mb-2">Jumlah Investasi (USD):</label>
                                <input
                                    type="number"
                                    id="investment"
                                    value={simInvestment}
                                    onChange={(e) => setSimInvestment(e.target.value)}
                                    placeholder="Contoh: 1000"
                                    step="0.01"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="buyPrice" className="block text-gray-400 text-sm font-bold mb-2">Harga Beli Koin:</label>
                                <input
                                    type="number"
                                    id="buyPrice"
                                    value={simBuyPrice}
                                    onChange={(e) => setSimBuyPrice(e.target.value)}
                                    placeholder="Contoh: 0.50"
                                    step="0.000001"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="sellPrice" className="block text-gray-400 text-sm font-bold mb-2">Harga Jual Koin:</label>
                                <input
                                    type="number"
                                    id="sellPrice"
                                    value={simSellPrice}
                                    onChange={(e) => setSimSellPrice(e.target.value)}
                                    placeholder="Contoh: 0.51"
                                    step="0.000001"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="buyFee" className="block text-gray-400 text-sm font-bold mb-2">Biaya Beli (%):</label>
                                <input
                                    type="number"
                                    id="buyFee"
                                    value={simBuyFee}
                                    onChange={(e) => setSimBuyFee(e.target.value)}
                                    placeholder="Contoh: 0.1"
                                    step="0.01"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="sellFee" className="block text-gray-400 text-sm font-bold mb-2">Biaya Jual (%):</label>
                                <input
                                    type="number"
                                    id="sellFee"
                                    value={simSellFee}
                                    onChange={(e) => setSimSellFee(e.target.value)}
                                    placeholder="Contoh: 0.1"
                                    step="0.01"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                                Hitung Simulasi
                            </button>
                        </form>

                        {simResult && (
                            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                                {simResult.error ? (
                                    <p className="text-red-400 font-bold">{simResult.error}</p>
                                ) : (
                                    <>
                                        <p className="text-white">Profit Bruto: <span className={`font-bold ${simResult.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>$ {simResult.grossProfit.toFixed(6)}</span></p>
                                        <p className="text-white">ROI: <span className={`font-bold ${simResult.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{simResult.roi.toFixed(2)} %</span></p>
                                        <p className="text-gray-400 text-sm">Jumlah Koin Dibeli: {simResult.amountBought.toFixed(6)}</p>
                                        <p className="text-gray-400 text-sm">Total Biaya Beli: $ {simResult.buyCostWithFee.toFixed(6)}</p>
                                        <p className="text-gray-400 text-sm">Pendapatan Bersih Jual: $ {simResult.netRevenue.toFixed(6)}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                 <footer className="text-center mt-12 text-gray-600 text-sm">
                    <p>Data disediakan oleh CoinGecko.</p>
                </footer>
            </div>

            {/* Modal Detail Koin */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform scale-95 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        {modalLoading && (
                            <div className="p-6 text-center">
                                <Spinner />
                            </div>
                        )}
                        {modalError && (
                            <div className="p-6 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                                <p>{modalError}</p>
                                <button onClick={closeCoinModal} className="mt-4 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg">Tutup</button>
                            </div>
                        )}
                        {selectedCoinDetails && !modalLoading && !modalError && (
                            <div className="p-6">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-700 mb-4">
                                    <div className="flex items-center space-x-3">
                                        {/* Logo utama koin yang diklik */}
                                        <img src={selectedCoinDetails.image?.small || genericPlaceholder} alt={selectedCoinDetails.name} className="w-10 h-10 rounded-full" />
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedCoinDetails.name}</h2>
                                            <p className="text-gray-400 text-sm">{selectedCoinDetails.symbol?.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <button onClick={closeCoinModal} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                                </div>

                                {/* Bagian Grafik TradingView (di sini akan kita masukkan) */}
                                <div className="mb-4 p-3 bg-gray-700/30 rounded-md">
                                    <h3 className="text-lg font-semibold text-white mb-2">Grafik Harga (7 Hari)</h3>
                                    <div ref={chartContainerRef} className="w-full h-[300px]">
                                        {/* Chart akan dirender di sini oleh lightweight-charts */}
                                        {!selectedCoinDetails.market_data?.current_price?.usd && (
                                            <p className="text-center text-gray-500 py-4">Data grafik tidak tersedia.</p>
                                        )}
                                    </div>
                                </div>


                                {/* Contract Addresses (Multi-chain) */}
                                {selectedCoinDetails.platforms && Object.keys(selectedCoinDetails.platforms).length > 0 && (
                                    <div className="mb-4 p-3 bg-gray-700/30 rounded-md">
                                        <h3 className="text-lg font-semibold text-white mb-2">Contract Addresses</h3>
                                        <div className="space-y-2 text-sm max-h-32 overflow-y-auto scrollbar-thin">
                                            {Object.entries(selectedCoinDetails.platforms).map(([platform, address]) => (
                                                address && (
                                                    <div key={platform} className="flex items-center justify-between bg-gray-700 rounded p-2">
                                                        <span className="text-gray-400">{platform}</span>
                                                        {/* Perbaikan untuk overflow alamat kontrak */}
                                                        <div className="flex items-center flex-grow mx-2 overflow-hidden">
                                                            <span className="text-white truncate text-xs flex-grow">{minimizeAddress(address)}</span> {/* Menggunakan minimizeAddress */}
                                                            <button onClick={() => copyToClipboard(address)} className="ml-2 text-cyan-400 hover:text-cyan-500 flex-shrink-0">
                                                                <Clipboard className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Market Data (Harga saat ini) */}
                                {selectedCoinDetails.market_data?.current_price?.usd && (
                                    <div className="mb-4 p-3 bg-gray-700/30 rounded-md">
                                        <h3 className="text-lg font-semibold text-white mb-2">Harga Saat Ini</h3>
                                        <p className="text-white text-2xl font-bold">$ {selectedCoinDetails.market_data.current_price.usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 6})}</p>
                                        <p className={`${selectedCoinDetails.market_data.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
                                            {selectedCoinDetails.market_data.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(selectedCoinDetails.market_data.price_change_percentage_24h || 0).toFixed(2)}% (24h)
                                        </p>
                                    </div>
                                )}

                                {/* Bursa (CEX/DEX) */}
                                {selectedCoinDetails.tickers && selectedCoinDetails.tickers.length > 0 && (
                                    <div className="mb-4 p-3 bg-gray-700/30 rounded-md">
                                        <h3 className="text-lg font-semibold text-white mb-2">Bursa Tersedia (Top 10)</h3>
                                        <div className="space-y-2 text-sm max-h-48 overflow-y-auto scrollbar-thin">
                                            {selectedCoinDetails.tickers.slice(0, 10).map((ticker, index) => (
                                                ticker.trade_url && ticker.converted_last && ticker.converted_last.usd > 0 && (
                                                    <a key={index} href={ticker.trade_url} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                                                        {/* Logo Token (ditampilkan) */}
                                                        <img src={selectedCoinDetails.image?.thumb || genericPlaceholder} alt={selectedCoinDetails.symbol} className="w-4 h-4 rounded-full mr-2 bg-gray-900 p-0.5" onError={(e) => { e.target.onerror = null; e.target.src=genericPlaceholder; }}/>
                                                        
                                                        <div className="flex-grow">
                                                            {/* Nama Bursa (dipersingkat jika DEX, sekarang lebih agresif) */}
                                                            <p className="text-white font-medium">{isDEX(ticker.market.name) ? cleanDexName(ticker.market.name) : ticker.market.name}</p>
                                                            {/* Pair */}
                                                            <span className="text-gray-400 text-xs">{ticker.base}/{ticker.target}</span>
                                                        </div>
                                                        <span className="text-white font-bold mr-2">${ticker.converted_last.usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span>
                                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${isDEX(ticker.market.name) ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}>{isDEX(ticker.market.name) ? 'DEX' : 'CEX'}</span>
                                                        <ArrowRight className="w-4 h-4 text-gray-400 ml-2"/>
                                                    </a>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
