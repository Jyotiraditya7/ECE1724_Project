import { FiAlertCircle } from "react-icons/fi"
import { alertIconClass } from "../lib/ui"

type AlertLabelProps = {
	alert: boolean,
	resetting: boolean
}

export default function AlertLabel({ alert, resetting}: AlertLabelProps) {
	return (
		<div className={`flex justify-self-center self-center w-min h-min px-3 space-x-2 border-2 rounded-full bg-cyan-800 ${resetting?'border-cyan-700':alert?'border-amber-600':'border-green-500'}`}>
			{!resetting && alert && <FiAlertCircle className={alertIconClass} />}
			<div>{resetting ? "Resetting..." : alert ? "Triggered" : "Live"}</div>
		</div>
	);
}
