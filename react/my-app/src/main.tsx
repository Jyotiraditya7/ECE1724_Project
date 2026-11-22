import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import './index.css'
import Login from './routes/Login.tsx'
import Dashboard from './routes/Dashboard.tsx'
import WatchDetails from './routes/WatchDetails.tsx'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<Login />}/>
				<Route path='/users/:id' element={<Dashboard />} />
				<Route path='/tickers/:id' element={<WatchDetails />}/>
			</Routes>
		</BrowserRouter>
  </StrictMode>,
)
