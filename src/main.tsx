import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PlayerProvider } from './context/PlayerContext.tsx'
import { SearchProvider } from './context/SearchContext.tsx'
import { CartProvider } from './context/CartContext.tsx'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<BrowserRouter>
			<CartProvider>
				<PlayerProvider>
					<SearchProvider>
						<App />
					</SearchProvider>
				</PlayerProvider>
			</CartProvider>
		</BrowserRouter>
	</React.StrictMode>
)
