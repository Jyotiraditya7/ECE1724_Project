import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Watch } from "../types";

// This will all be fetched from backend using Watch id number passed in as route param
const TEMP_WATCH: Watch = {
	id: -1,
	ticker: "AAPL",
	purchasePrice: 100,
	currPrice: 102,
	updateTime: new Date(),
	gainPct:10,
	lossPct:5,
	triggered: false,
	user_id:'demo-test'
}

export default function WatchDetails() {
	const params = useParams();
	const navigate = useNavigate();

	const [watch, setWatch] = useState(TEMP_WATCH);

	return (
		<div>
			<h1>Money Watch</h1>
			<button type='button' onClick={()=>navigate(`/users/${watch.user_id}`)}>Back</button>
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
					<td>{watch.currPrice}</td>
					<td>{watch.updateTime.toLocaleDateString()}</td>
					<td>{watch.gainPct}</td>
					<td>{watch.lossPct}</td>
					<td>{watch.triggered ? "Triggered" : "Not Triggered"}</td>
				</tr>
			</table>
			<button type='button' onClick={()=>navigate(`/users/${watch.user_id}`)}>Save Changes</button>
		</div>
	);
}
