import type { Watch } from "../types"
import { FiAlertCircle} from "react-icons/fi"

type WatchCardProps = {
	ticker: string;
	triggered: boolean;
	onClick: () => void;
}

export default function WatchCard({ ticker, triggered, onClick}: WatchCardProps) {
	return (
		<div>
			<section>
				<p>{ticker}</p>
				{triggered && <FiAlertCircle />}
			</section>
			<button type='button' onClick={onClick}>Details</button>
		</div>
	);
}
