import { getUserIdCook } from "@/actions/Db";
import Order from "@/components/Order";
import { redirect } from "next/navigation";

const Home = async ({params: {id}}: {params: {id: number}}) => {
	const user_cook = await getUserIdCook()
	if (!user_cook) { redirect('/login') }
	// console.log(user_cook.id)
	return (
		<main className="flex flex-col items-center justify-between">
			<Order proj_id={id} user_id={user_cook.id} />
		</main>
	);

}
export default Home