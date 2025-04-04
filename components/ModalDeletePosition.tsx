import { dbDeletePosition } from "@/actions/Db";
import { useState } from "react"

const ModalDeletePosition = ({ projectId, positionId, onClose }: any ) => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (isLoading) return; // Предотвращаем повторное нажатие
        
        setIsLoading(true); // Устанавливаем состояние загрузки
        
        try {
            const success = await dbDeletePosition(positionId);
            
            if (success) {
                console.log('Позиция успешно удалена');
                window.location.href = `/project/${projectId}`;
            } else {
                console.error('Не удалось удалить позицию');
                window.location.href = `/project/${projectId}`;
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            setIsLoading(false); // Сбрасываем состояние загрузки при ошибке
        }
    };

    return (
        <div className="modal flex flex-col my-auto mt-32 gap-4 p-6 pb-4 border rounded-md border-gray top-0 fixed bg-white w-80">
            <h2 className="font-bold mx-auto mb-2">Удаление позиции</h2>
            <div className='flex flex-col gap-2 text-sm'>
                {/* <span className="mx-auto">Удалить данную позицию ?</span> */}
                <button className='text-white px-3 py-2 text-sm border border-transparent font-semibold bg-blue-600 rounded-lg disabled:opacity-40' disabled={isLoading} onClick={handleSubmit}>Удалить</button>
                <button className='px-3 py-2 text-sm border rounded-lg border-gray-200 hover:bg-gray-100 cursor-pointer ' onClick={onClose}>Отмена</button>
            </div>
            <p className='text-gray-500 text-sm mx-auto'></p>
        </div>
    );
}

export default ModalDeletePosition
