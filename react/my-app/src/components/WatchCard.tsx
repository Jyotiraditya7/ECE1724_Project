import { FiAlertCircle } from "react-icons/fi"
import {Button} from "./ui/button"
import { alertIconClass, clickableText, tickerClass } from "../lib/ui";
import ChangePctLabel from "./ChangePctLabel";

type WatchCardProps = {
	id: number;
	ticker: string;
	triggered: boolean;
	changePct: number;
	locked: boolean;
	onView: (id: number) => void;
	onDelete: (id: number, ticker:string) => void;
}

export default function WatchCard({ id, ticker, triggered, changePct, locked, onView, onDelete }: WatchCardProps) {
	return (
		<div className="flex justify-between md:w-2/3 w-full p-3 border-4 rounded-3xl border-cyan-900 bg-blue-300">
			<div className="flex-col">
				<div className="flex justify-center">
					<p className={tickerClass}>{ticker}</p>
					{triggered && <FiAlertCircle className={alertIconClass}/>}
				</div>
				<button type='button' disabled={locked} onClick={()=>onView(id)} className={clickableText}>View Details</button>
			</div>
			<ChangePctLabel pct={changePct}/>
			<Button type='button' disabled={locked} onClick={()=>{onDelete(id, ticker)}} className="w-7 h-7 border-2 text-white bg-red-700 hover:text-red-400 hover:bg-cyan-950 hover:border-red-600">X</Button>
		</div>
	);
}
