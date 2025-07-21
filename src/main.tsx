import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PlayerProvider } from './context/PlayerContext.tsx'
import { SearchProvider } from './context/SearchContext.tsx'
import { CartProvider } from './context/CartContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<PlayerProvider>
			<SearchProvider>
				<CartProvider>
					<App />
				</CartProvider>
			</SearchProvider>
		</PlayerProvider>
	</React.StrictMode>
)
