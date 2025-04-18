import { dbEditUser } from "@/actions/Db";
import { useState } from "react";

const ModalEditUser = ({ user , onClose } : any ) => {
	const [email, setEmail] = useState('')
	const [name, setName] = useState('')
	const [password, setPassword] = useState('')

	// useEffect(() => {
	// 	// Здесь вы можете загрузить данные пользователя по userId для редактирования
	// }, [user.id]);

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		await dbEditUser(user.id, name, email, password);
		// onClose(); // Закрыть модальное окно после сохранения
		window.location.href = `/users`;
	};

	return (
		<div className="modal flex flex-col my-auto mt-32 gap-4 p-6 pb-4 border rounded-md border-gray top-0 fixed bg-white w-80">
			<h2 className="font-bold mx-auto mb-2">Редактировать пользователя</h2>
			<form onSubmit={handleSubmit} className='flex flex-col gap-2 text-sm '>
				<span>Имя</span>
				<input className='mb-2 max-w-full py-2 px-3 rounded-lg border my-auto ' defaultValue={user.name} onChange={(e) => setName(e.target.value)} />
				<span>Email</span>
				<input className='mb-2 max-w-full py-2 px-3 rounded-lg border my-auto ' defaultValue={user.email} onChange={(e) => setEmail(e.target.value)} />
				<span>Задать новый пароль</span>
				<input className='mb-4 max-w-full py-2 px-3 rounded-lg border my-auto bg-gray-100' type="password" defaultValue='' onChange={(e) => setPassword(e.target.value)} />
				<button className='text-white px-3 py-2 text-sm border border-transparent font-semibold bg-blue-600 rounded-lg disabled:opacity-40' type="submit">Сохранить</button>
				<button className='px-3 py-2 text-sm border rounded-lg border-gray-200 hover:bg-gray-100 cursor-pointer ' onClick={onClose}>Отмена</button>
			</form>
			<p className='text-gray-500 text-sm mx-auto'></p>
		</div>
	);
}

export default ModalEditUser
