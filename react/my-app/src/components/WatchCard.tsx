import { FiAlertCircle} from "react-icons/fi"

type WatchCardProps = {
	id: number;
	ticker: string;
	triggered: boolean;
	onView: (id: number) => void;
	onDelete: (id: number, ticker:string) => void;
}

export default function WatchCard({ id, ticker, triggered, onView, onDelete }: WatchCardProps) {

	async function handleView() {
		onView(id);
	}

	async function handleDelete() {
		onDelete(id, ticker);
	}

	return (
		<div>
			<section>
				<p>{ticker}</p>
				{triggered && <FiAlertCircle />}
			</section>
			<button type='button' onClick={handleView}>View Details</button>
			<button type='button' onClick={handleDelete}>Delete</button>
		</div>
	);
}
