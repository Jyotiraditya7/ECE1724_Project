import { FiArrowUp, FiArrowDown } from "react-icons/fi"

type ChangePctProps = {
	pct: number;
}

export default function ChangePctLabel({pct}: ChangePctProps) {
	return (
		<div className={`flex justify-self-center self-center w-min h-10 px-3 space-x-2 border-2 rounded-full bg-cyan-800 ${pct>0?'border-green-600':'border-red-600'}`}>
			{pct > 0 ?
				<FiArrowUp className="self-center border-2 rounded-full text-2xl border-green-600 bg-cyan-950 text-green-400 " /> :
				<FiArrowDown className="self-center border-2 rounded-full text-2xl border-red-600 bg-cyan-950 text-red-500" />
			}
			<div className={`self-center text-xl font-bold ${pct>0?'text-green-500':'text-red-600'}`}>
				{`${Math.round(pct * 100) / 100}%`}
			</div>
		</div>
	);
}
