import { FiAlertCircle, FiArrowUp, FiArrowDown } from "react-icons/fi"
import {Button} from "./ui/button"
import { clickableText } from "../lib/ui";

type WatchCardProps = {
	id: number;
	ticker: string;
	triggered: boolean;
	changePct: number;
	onView: (id: number) => void;
	onDelete: (id: number, ticker:string) => void;
}

export default function WatchCard({ id, ticker, triggered, changePct, onView, onDelete }: WatchCardProps) {

	async function handleView() {
		onView(id);
	}

	async function handleDelete() {
		onDelete(id, ticker);
	}

	return (
		<div className="flex justify-between md:w-2/3 w-full p-3 border-4 rounded-3xl border-cyan-900 bg-blue-300">
			<div className="flex-col w-1/3">
				<div className="flex justify-center">
					<p className="text-2xl font-extrabold text-gray-900">{ticker}</p>
					{triggered && <FiAlertCircle className="border rounded-full text-xl border-cyan-900 bg-orange-600 text-gray-100"/>}
				</div>
				<button type='button' onClick={handleView} className={clickableText}>View Details</button>
			</div>
			<div className="flex w-1/3 justify-start space-x-2">
				{changePct > 0 ?
					<FiArrowUp className="self-center border rounded-full text-2xl border-green-500 bg-cyan-950 text-green-400 " /> :
					<FiArrowDown className="self-center border rounded-full text-2xl border-red-600 bg-cyan-950 text-red-500" />
				}
				<div className="self-center text-xl font-bold text-cyan-950">
					{`${Math.round(changePct*100)/100}%`}
				</div>
			</div>
			<Button type='button' onClick={handleDelete} className="w-7 h-7 border-2 text-white bg-red-700 hover:text-red-400 hover:bg-cyan-950 hover:border-red-600">X</Button>
		</div>
	);
}
