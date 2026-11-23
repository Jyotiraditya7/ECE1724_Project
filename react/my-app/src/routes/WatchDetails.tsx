import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Watch } from "../types";
import WatchForm from "../components/WatchForm";

// This will all be fetched from backend using Watch id number passed in as route param
const TEMP_WATCH: Watch = {
	id: -1,
	ticker: "AAPL",
	purchasePrice: 100,
	gainPct:10,
	lossPct:5,
	gainNotified: false,
	lossNotified: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	currentPrice: 102,
	priceUpdatedAt: new Date,
	changeAmount: 2,
	changePct: 2
}

export default function WatchDetails() {
	const params = useParams();
	const navigate = useNavigate();

	const [watch, setWatch] = useState(TEMP_WATCH);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		async function loadWatch() {
			try {
				const response = await fetch(`/api/watches/${params.watchid}`);

				if (!response.ok) {
					throw new Error("Error loading watches");
				}
				const data = await response.json();
				setWatch(data);
			} catch {
				// TODO: Set loadError to true
				setLoadError(true);
			} finally {
				// TODO: Set loading to false
				setLoading(false);
			}
		}
		loadWatch();
	}, [params.watchid]);

	async function handleSubmit() {
		navigate(`/users/${params.userid}`);
  }

	return (
		<div>
			<h1>Money Watch</h1>
			{loading ? (
				<div><p>Loading StockWatch...</p></div>
			) : loadError ? (
				<div><p>Error Loading StockWatch</p></div>
			) : (
				<div>
					<h2>{`${watch.ticker} Stock Watch Summary`}</h2>
					<table>
						<tr>
							<th>Purchased Price</th>
							<th>Current Price</th>
							{/*<th>Last Updated</th>*/}
							<th>Gain Alert Status</th>
							<th>Loss Alert Status</th>
						</tr>
						<tr>
							<td>{watch.purchasePrice}</td>
							<td>{watch.currentPrice}</td>
							{/*<td>{watch.priceUpdatedAt.toLocaleDateString()}</td> */}
							<td>{watch.gainNotified ? "Triggered" : "Live"}</td>
							<td>{watch.lossNotified ? "Triggered" : "Live"}</td>
						</tr>
					</table>
					<WatchForm
						watch={{
							ticker: watch.ticker,
							purchasePrice: watch.purchasePrice.toString(),
							gainPct: watch.gainPct.toString(),
							lossPct: watch.lossPct.toString()
						}}
					onSubmit={handleSubmit} />
				</div>
			)}
			<button type='button' onClick={() => navigate(`/users/${params.userid}`)}>Back</button>
		</div>
	);
}
