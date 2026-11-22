import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Watch } from "../types";

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

	return (
		<div>
			<h1>Money Watch</h1>
			<button type='button' onClick={()=>navigate(`/users/${params.userid}`)}>Back</button>
			<table>
				<tr>
					<th>Ticker</th>
					<th>Purchased Price</th>
					<th>Current Price</th>
					<th>Last Updated</th>
					<th>Gain Threshold</th>
					<th>Loss Threshold</th>
					<th>Status</th>
				</tr>
				<tr>
					<td>{watch.ticker}</td>
					<td>{watch.purchasePrice}</td>
					<td>{watch.currentPrice}</td>
					<td>{watch.updatedAt.toLocaleDateString()}</td>
					<td>{watch.gainPct}</td>
					<td>{watch.lossPct}</td>
					<td>{watch.gainNotified ? "Triggered" : "Not Triggered"}</td>
				</tr>
			</table>
			<button type='button' onClick={()=>navigate(`/users/${params.userid}`)}>Save Changes</button>
		</div>
	);
}
