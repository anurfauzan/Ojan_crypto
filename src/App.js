import React, { useState } from 'react';
import { Search, Coins, AlertTriangle } from 'lucide-react'; // Pastikan lucide-react terinstal di package.json

// Komponen Spinner untuk loading state
const Spinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2">
        <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-cyan-300">Mencari token...</p>
    </div>
);

export default function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault(); // Mencegah refresh halaman
        if (!searchTerm) {
            setError('Silakan masukkan nama atau simbol token.');
            return;
        }
        
        setLoading(true);
        setError(null);
        setSearchResults([]); // Bersihkan hasil sebelumnya

        try {
            // Memanggil CoinGecko API untuk mencari token
            const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${searchTerm}`);
            if (!response.ok) {
                throw new Error(`Gagal mencari token. Status: ${response.status}`);
            }
            const data = await response.json();

            if (!data.coins || data.coins.length === 0) {
                setError(`Token "${searchTerm}" tidak ditemukan.`);
                return;
            }
            // Filter hanya koin yang memiliki data harga (tidak hanya NFT atau kategori lain)
            const filteredCoins = data.coins.filter(coin => coin.market_cap_rank !== null && coin.id);
            setSearchResults(filteredCoins);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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

                {/* Area Tampilan Konten */}
                <div className="space-y-6">
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
                                            <tr key={coin.id} className="border-t border-gray-700/50 hover:bg-gray-700/50 transition-colors cursor-pointer">
                                                <td className="p-3 flex items-center gap-2">
                                                    <img src={coin.thumb} alt={coin.name} className="w-5 h-5 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/20x20/FFFFFF/000000?text=?'; }}/>
                                                    <span className="font-medium text-white">{coin.name}</span>
                                                </td>
                                                <td className="p-3 font-mono text-gray-400">{coin.symbol.toUpperCase()}</td>
                                                <td className="p-3 text-right text-white">{coin.market_cap_rank}</td>
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
                 <footer className="text-center mt-12 text-gray-600 text-sm">
                    <p>Data pencarian disediakan oleh CoinGecko.</p>
                </footer>
            </div>
        </div>
    );
}
