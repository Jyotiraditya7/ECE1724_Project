import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Watch, WatchPayload} from "../types";
import WatchForm from "../components/WatchForm";
import { pageContainerClass, msgClass, errorMsgClass, h2Class, tickerClass, tableClass, tableHeaderClass, tableEntryClass, submitClass, buttonClass, alertIconClass } from "../lib/ui";
import ChangePctLabel from "../components/ChangePctLabel";
import Banner from "../components/Banner";
import { Button } from "../components/ui/button";
import AlertLabel from "../components/AlertLabel";
import { Switch } from "../components/ui/switch";

// This will all be fetched from backend using Watch id number passed in as route param
const empty_watch: Watch = {
	id: -1,
	ticker: "XYZ",
	purchasePrice: 0,
	gainPct:0,
	lossPct:0,
	gainNotified: false,
	lossNotified: false,
	createdAt: "",
	updatedAt: "",
	currentPrice: 0,
	priceUpdatedAt: "",
	changeAmount: 0,
	changePct: 0
}

export default function WatchDetails() {
	const params = useParams();
	const navigate = useNavigate();

	const [watch, setWatch] = useState(empty_watch);
	const [submitting, setSubmitting] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);
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

	async function handleSubmit(payload: WatchPayload) {
		try {
			if (submitting) throw new Error("Error updating watch: Submission Handler Busy");
			setSubmitting(true);
			const response = await fetch(`/api/watches/${params.watchid}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error("Error updating watch");
			}
			navigate(`/users/${params.userid}`);
		} catch {
      // TODO: Set message to "Error creating paper"
      // TODO: Return false
		} finally {
			setSubmitting(false);
		}
	}

	async function handleNotifReset() {
		//If submitting is true, the notifs will be reset by the other submission process
		if (submitting) return;
		// Send a copy of the watch as a WatchPayload to trigger alert reset
		const payload: WatchPayload = { ticker: watch.ticker, purchasePrice: watch.purchasePrice, gainPct: watch.gainPct, lossPct: watch.lossPct };

		try {
			setSubmitting(true);
			setMsg("Resetting Alerts...");
			const response = await fetch(`/api/watches/${params.watchid}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})
			if (!response.ok) {
				throw new Error("Error updating watch");
			}
			const data = await response.json();
			setWatch(data);

		} catch {
      // TODO: Set message to "Error creating paper"
      // TODO: Return false
		} finally {
			setSubmitting(false);
			setMsg(null);
    }
	}

	return (
		<div className={pageContainerClass}>
			<Banner/>
			<div className="w-full p-3 border-4 rounded-3xl bg-gray-400 border-cyan-950">
				{loading ? (
					<div className={msgClass}>Loading StockWatch...</div>
				) : loadError ? (
					<div className={errorMsgClass}>Error Loading StockWatch</div>
				) : (
					<div className="flex-col justify-items-center space-y-10 mb-2">
						<div className="flex space-x-2">
							<p className={`${tickerClass} lg:text-3xl text-2xl`}>{watch.ticker}</p>
							<p className={h2Class}>Stock Watch Summary</p>
						</div>
						<table className={tableClass}>
							<tr>
								<th className={tableHeaderClass}>Purchased Price</th>
								<th className={tableHeaderClass}>Current Price</th>
								<th className={tableHeaderClass}>% Change from Purchased</th>
								<th className={tableHeaderClass}>Last Updated</th>
								<th className={tableHeaderClass}>Gain Alert Status</th>
								<th className={tableHeaderClass}>Loss Alert Status</th>
								<th className={tableHeaderClass}>Reset Alerts</th>
							</tr>
							<tr>
								<td className={tableEntryClass}>{`$${watch.purchasePrice}`}</td>
								<td className={tableEntryClass}>{!watch.currentPrice ? "N/A" : `$${watch.currentPrice}`}</td>
								<td className={tableEntryClass}>{!watch.currentPrice ? "N/A" : <ChangePctLabel pct={watch.changePct} />}</td>
								<td className={tableEntryClass}>{!watch.currentPrice ? "N/A" : new Date(watch.priceUpdatedAt).toLocaleTimeString()}</td>
								<td className={tableEntryClass}><AlertLabel alert={watch.gainNotified}/></td>
								<td className={tableEntryClass}><AlertLabel alert={watch.lossNotified}/></td>
								<td className={tableEntryClass}>
									<Switch
										disabled={submitting || (!watch.gainNotified && !watch.lossNotified)}
										checked={!watch.gainNotified && !watch.lossNotified}
										onCheckedChange={()=>handleNotifReset()}
										className={`border-3 ${watch.gainNotified || watch.lossNotified ? 'border-amber-500 hover:shadow-md hover:shadow-yellow-600': ''}`}
									/>
								</td>
							</tr>
						</table>
						{msg && <div className={msgClass}>{msg}</div>}
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
				<Button type='button' onClick={() => navigate(`/users/${params.userid}`)} className={buttonClass}>Back</Button>
			</div>
		</div>
	);
}
