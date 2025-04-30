/* eslint-disable react/display-name */
'use client'

import Link from 'next/link'
import { dbGetKoefs, dbGetProject, dbUpdateKoefs, dbUpdatePositions, dbUpdateProjectInfo } from '@/actions/Db'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState } from 'react'
import Position from './Position'
import Koef from './Koef'
import ModalDeletePosition from './ModalDeletePosition'

const Order = ({proj_id, user_id}: any) => { 
	const [isDeletePositionModalOpen, setIsDeletePositionModalOpen] = useState(false)
	const [selectedPosition, setSelectedPosition] = useState<any | null>(null)

	const [visibleKoefs, setVisibleKoefs] = useState<{ [key: string]: boolean }>({});
	const [formChanged, setFormChanged] = useState(Number)
	const [isProjectInfoOpen, setProjectInfoOpen] = useState(true)
	const [projectInfo, setProjectInfo] = useState<any | null>(null)
	const [positions, setPositions] = useState<any | null>(null)
	const [docKoefs, setDocKoefs] = useState<any | null>(null)
	const [sums, setSums] = useState<any | null>(null)
	// const [openedAt, setOpenedAt] = useState<Date | null>(null)
	
	const handleDeleteClick = (positionId: any) => {
		setSelectedPosition(positionId)
		isDeletePositionModalOpen ? setIsDeletePositionModalOpen(false) : setIsDeletePositionModalOpen(true)
	}
	const toggleKoefsVisibility = useCallback((positionId: string) => {
		setVisibleKoefs((prevState) => ({
		  ...prevState,
		  [positionId]: !prevState[positionId],
		}));
	}, [])
	
	useEffect(() => {
		const fetchFields = async () => {
		  	const data = await dbGetProject(proj_id)
			const koefs = await dbGetKoefs(proj_id)
			setDocKoefs(koefs)
			// console.log(koefs)
		    setPositions(data?.fields)
			setProjectInfo(data)
			// для защиты от двойных обновлений 
			// setOpenedAt(new Date())
			// console.log('opened at:', new Date())
			// console.log('updated at:', data?.updatedAt)
		}
		fetchFields()
	}, [proj_id])

	const saveProject = async () => {
		
		try {
			const data = await dbGetProject(proj_id)
			// console.log('new saveProject data: ', data?.updatedAt)
			// console.log('old saveProject data: ', projectInfo?.updatedAt)

			// проверка изменения проекта
			// if (data?.updatedAt && projectInfo?.updatedAt && 
			// 	new Date(data.updatedAt).getTime() !== new Date(projectInfo.updatedAt).getTime()) {
			// 	setFormChanged(4)
			// 	return
			// }

			// console.log('projectInfo: ', projectInfo)
			// const updateProject = await dbUpdateProjectInfo(projectInfo, user_id)
			setFormChanged(3)
			const updateProject = await dbUpdateProjectInfo(projectInfo.id, projectInfo.client, projectInfo.description, projectInfo.dog_num, projectInfo.location, projectInfo.name, projectInfo.phone1, user_id)
			// console.log('Project updated successfully:', updateProject)
			const updatePositions = await dbUpdatePositions(projectInfo.id, positions)
			// console.log('Positions updated:', updatePositions)
			const updateKoefs = await dbUpdateKoefs(docKoefs)
			// console.log('Koefs updated:', updateKoefs)
			if(updateProject && updatePositions && updateKoefs) {
				setFormChanged(0)
				window.location.href = `/project/${projectInfo.id}`
			} else {
				setFormChanged(2)
			}
		} catch (error) {
		  	console.error('Error updating project:', error)
		}
	};

	const toggleProjectInfo = () => {
	  	setProjectInfoOpen(!isProjectInfoOpen);
	}
	
	const handleInputChange = useCallback(() => {
        setFormChanged(1);
    }, []);
	
	// по названию поля меняем значение - или инфа о договоре или коэф-ты
	const handleOrderChange = useCallback((name: string) => (e: any) => {
        let newValue = e.target.value;
        setProjectInfo((projectInfo: any) => ({ ...projectInfo, [name]: newValue }));
        handleInputChange();
    }, [handleInputChange])
	
	const handlePosCreate = useCallback((id: number, name: string, price: number, value: number, measure: string, code: number, new_pos: boolean) => {
        setPositions((positions: any[]) => {
            const index = positions.findIndex((pos: any) => pos.id === id);
            if (index === -1 && new_pos) {
                return [...positions, { id, name, price, value, measure, code, new_pos }];
            }
        });
        handleInputChange();
    }, [handleInputChange])

	// при смене позиции обновляем ее в базе
	// также ищем все связанные позиции (и перемножаем их индивидуальный фин. коэф-т)
	const handlePosChange = (id: number, fixed_id: string, measure: string, name: string, value: number, price: number) => {
		// если позиция влияет на другие - задаем связи
		let upd_pos: string[] = []
		// если меняем Х то пересчитывается и ...
		// if (fixed_id == '1_1') { upd_pos = ['1_2', '1_3', '1_4', '1_5', '1_6', '1_7', '1_8'] } // фундамент
		// else if (fixed_id == '3_1') { upd_pos = ['2_1'] } // монтаж обв бруса
		// else if (fixed_id == '2_3') { upd_pos = ['2_3','2_4'] } // сборка бруса
		
			setPositions((positions: any[]) => {
				return positions.map((pos: any) => {
					// обновляем саму позицию
					if (pos.id === id) {
						return { ...pos, measure, name, value, price }
					}

					// перебираем все другие позиции 
					// фундамент
					if (fixed_id === '1_1' && ['1_2', '1_3', '1_4', '1_5', '1_6', '1_7'].includes(pos.fixed_id) ) {
						return { ...pos, value: value }
					}

					// кл брус - 1 позиция
					if ((fixed_id === '3_1') && ['2_1'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_20')
						return { ...pos, value: value + pos2.value }
					}
					if ((fixed_id === '3_20') && ['2_1'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_1')
						return { ...pos, value: value + pos2.value }
					}

					// обвяз брус - 3 позиции, сумма
					if ((fixed_id === '3_3') && ['2_2'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_4')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_5')
						return { ...pos, value: value + pos2.value + pos3.value }
					}
					if ((fixed_id === '3_4') && ['2_2'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_3')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_5')
						return { ...pos, value: value + pos2.value + pos3.value }
					}
					if ((fixed_id === '3_5') && ['2_2'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_3')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_4')
						return { ...pos, value: value + pos2.value + pos3.value }
					}

					// обвяз брус + лаги - в антисептирование, сумма
					if ((fixed_id === '3_1') && ['2_4'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_14')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_15')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '3_20')
						// const pos4 = positions.find((pos: any) => pos.fixed_id === '3_16')
						return { ...pos, value: Math.round((value + pos2.value + pos3.value + pos4.value) * 100) / 100 }
					}
					if ((fixed_id === '3_14') && ['2_4'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_1')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_15')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '3_20')
						return { ...pos, value: Math.round((value + pos2.value + pos3.value + pos4.value) * 100) / 100 }
					}
					if ((fixed_id === '3_15') && ['2_4'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_1')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_14')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '3_20')
						return { ...pos, value: Math.round((value + pos2.value + pos3.value + pos4.value) * 100) / 100 }
					}
					if ((fixed_id === '3_20') && ['2_4'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '3_1')
						const pos3 = positions.find((pos: any) => pos.fixed_id === '3_14')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '3_15')
						return { ...pos, value: Math.round((value + pos2.value + pos3.value + pos4.value) * 100) / 100 }
					}
					
					// кровля (нет)стропилы + контробрешетки + обрешетки   -  в антисеп
					// if ((fixed_id === '5_1') && ['4_11'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '5_2')
					// 	const pos3 = positions.find((pos: any) => pos.fixed_id === '5_3')
					// 	const pos4 = positions.find((pos: any) => pos.fixed_id === '5_4')
					// 	return { ...pos, value: value + pos2.value + pos3.value + pos4.value }
					// }
					// if ((fixed_id === '5_2') && ['4_11'].includes(pos.fixed_id) ) {
					// 	// сумма двух позиций
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '5_1')
					// 	const pos3 = positions.find((pos: any) => pos.fixed_id === '5_3')
					// 	const pos4 = positions.find((pos: any) => pos.fixed_id === '5_4')
					// 	return { ...pos, value: value + pos2.value + pos3.value + pos4.value }
					// }
					if ((fixed_id === '5_3') && ['4_11'].includes(pos.fixed_id) ) {
						// сумма двух позиций
						// const pos2 = positions.find((pos: any) => pos.fixed_id === '5_1')
						// const pos3 = positions.find((pos: any) => pos.fixed_id === '5_2')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '5_4')
						return { ...pos, value: value  + pos4.value }
					}
					if ((fixed_id === '5_4') && ['4_11'].includes(pos.fixed_id) ) {
						// сумма двух позиций
						// const pos2 = positions.find((pos: any) => pos.fixed_id === '5_1')
						// const pos3 = positions.find((pos: any) => pos.fixed_id === '5_2')
						const pos4 = positions.find((pos: any) => pos.fixed_id === '5_3')
						return { ...pos, value: value + pos4.value }
					}

					// фасад Подшив свесов кровли , копия в шлифовку
					// if ((fixed_id === '6_1') && ['6_3'].includes(pos.fixed_id) ) {
					// 	return { ...pos, value: value }
					// }
					// Монтаж лобовых досок , копия в шлифовку
					// if ((fixed_id === '6_2') && ['6_4'].includes(pos.fixed_id) ) {
					// 	return { ...pos, value: value }
					// }
					
					// КОЭФФИЦИЕНТЫ
					// сохранить temp_val
					// сохранить value * finalKoef
					
					// фасад - расх материалы ( сумма шлифовок )
					// if ((fixed_id === '6_3') && ['7_3'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '6_4')
					// 	return { ...pos, value: (value + pos2.value) }
					// }
					// // фасад - расх материалы ( сумма шлифовок )
					// if ((fixed_id === '6_4') && ['7_3'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '6_3')
					// 	return { ...pos, value:(value + pos2.value) }
					// }
		
					// коэффициенты k7_1_doska
					// доска - сумма шлифовок x 0.02 x 1.2
					if ((fixed_id === '6_1') && ['6_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_2')
						// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
						return { ...pos, valueNoKoef: (value), value: Math.round((value + pos2.value) * 1.68 * 100) / 100 }
					}
					if ((fixed_id === '6_2') && ['6_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_1')
						// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
						return { ...pos, valueNoKoef: (value), value: Math.round((value + pos2.value) * 1.68 * 100) / 100 }
					}
					if ((fixed_id === '6_1') && ['7_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_2')
						// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
						return { ...pos, valueNoKoef: (value), value: Math.round((value + pos2.value) * 1.68 * 100) / 100 }
					}
					if ((fixed_id === '6_2') && ['7_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_1')
						// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
						return { ...pos, valueNoKoef: (value), value: Math.round((value + pos2.value) * 1.68 * 100) / 100 }
					}
					if ((fixed_id === '6_1') && ['7_2'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_2')
						// console.log('7_2 pos.finalKoef: ', pos.finalKoef)
						// console.log('valueNoKoef: ', value)
						return { ...pos, valueNoKoef: (value + pos2.value), value: Math.round((value + pos2.value) * pos.finalKoef * 1.68 * 100) / 100 }
					}
					if ((fixed_id === '6_2') && ['7_2'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '6_1')
						// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
						return { ...pos, valueNoKoef: (value + pos2.value), value: Math.round((value + pos2.value) * pos.finalKoef * 1.68 * 100) / 100 }
					}
					// if ((fixed_id === '7_1') && ['7_2'].includes(pos.fixed_id) ) {
					// 	// const pos2 = positions.find((pos: any) => pos.fixed_id === '6_2')
					// 	// console.log('6_3[d] pos.finalKoef: ', pos.finalKoef)
					// 	// const extraKoef = docKoefs.find((koef: any) => koef.koef_code === 'k6_3_fasad_doska')
					// 	// return { ...pos, valueNoKoef: (value), value: Math.round((value) * extraKoef.value * pos.finalKoef * 100) / 100 }
					// 	return { ...pos, valueNoKoef: (value), value: Math.round((value) * pos.finalKoef * 100) / 100 }
					// }
					// if ((fixed_id === '6_2') && ['7_1'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '6_1')
					// 	// console.log('6_4[d] pos.finalKoef: ', pos.finalKoef)
					// 	return { ...pos, valueNoKoef:(value + pos2.value), value: Math.round((value + pos2.value) * pos.finalKoef * 100) / 100 }
					// }

					// окраска фасада k7_2_okraska свесы кровли
					// if ((fixed_id === '6_3') && ['7_2'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '6_4')
					// 	// console.log('6_3[k] pos.finalKoef: ', pos.finalKoef)
					// 	return { ...pos, valueNoKoef: (value + pos2.value), value: Math.ceil ((value + pos2.value) * pos.finalKoef )}
					// 	// return { ...pos, valueNoKoef: (value + pos2.value), value: Math.round((value + pos2.value) * pos.finalKoef * 100) / 100  }
					// }
					// if ((fixed_id === '6_4') && ['7_2'].includes(pos.fixed_id) ) {
					// 	const pos2 = positions.find((pos: any) => pos.fixed_id === '6_3')
					// 	// console.log('6_4[k] pos.finalKoef: ', pos.finalKoef)
					// 	return { ...pos, valueNoKoef: (value + pos2.value), value: Math.ceil ((value + pos2.value) * pos.finalKoef )}
					// 	// return { ...pos, valueNoKoef: (value + pos2.value), value: Math.round((value + pos2.value) * pos.finalKoef * 100) / 100  }
					// }

					// 9_1 окраска фасада - краска на фасад
					if ((fixed_id === '8_1') && ['9_1'].includes(pos.fixed_id) ) {
						// return { ...pos, value: value }
						return { ...pos, valueNoKoef: (value), value: Math.ceil(value * pos.finalKoef) }
						// return { ...pos, valueNoKoef: (value ), value: Math.round(value * pos.finalKoef * 100) / 100 }

					}
					// 9_2 окраска фасада - краска на перерубы 
					if ((fixed_id === '8_2') && ['9_2'].includes(pos.fixed_id) ) {
						return { ...pos, valueNoKoef: (value), value: Math.ceil(value * pos.finalKoef ) }
						// return { ...pos, valueNoKoef: (value ), value: Math.round(value * pos.finalKoef * 100) / 100 }
					}
					// 9_3 расходники на окраску - сумма шлифовок
					if ((fixed_id === '8_1') && ['9_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '8_2')
						return { ...pos, value: (value + pos2.value) }
					}
					if ((fixed_id === '8_2') && ['9_3'].includes(pos.fixed_id) ) {
						const pos2 = positions.find((pos: any) => pos.fixed_id === '8_1')
						return { ...pos, value: (value + pos2.value) }
					}
					// 10_3 терраса - копия монтаж обрешетки на монтаж доски пола
					if ((fixed_id === '10_2') && ['10_3'].includes(pos.fixed_id) ) {
						return { ...pos, value: value }
					}
					if ((fixed_id === '10_2') && ['11_3'].includes(pos.fixed_id) ) {
						return { ...pos, valueNoKoef: (value), value: Math.round(value * pos.finalKoef * 100) / 100 }
					}  
					// утепление кровли 13_1 - 100  
					if ((fixed_id === '12_1') && ['13_1'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k13_1_krov_utep100' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }
						// return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 100) / 100 }
					}
					// утепление кровли 13_2 - 50  
					if ((fixed_id === '12_3') && ['13_3'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k13_3_krov_utep50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value) * balancer.value * 1000) / 1000 }
					}
					// монтаж отливов - копия 
					// if ((fixed_id === '15_7') && ['14_5'].includes(pos.fixed_id) ) {
					// 	return { ...pos, value: value }
					// }
					// ПОЛЫ 1 ЭТ
					// утепление полы 16_1 - 100  
					if ((fixed_id === '16_5') && ['17_6'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k17_6_poli_utepl100' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }
					}
					// утепление 16_7 - 50 
					if ((fixed_id === '16_7') && ['17_8'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k17_8_poli_utepl50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }				}
					// полы 1 этаж - фанера
					if ((fixed_id === '16_9') && ['17_13'].includes(pos.fixed_id) ) {
						return { ...pos, valueNoKoef: (value ), value: Math.ceil(value * pos.finalKoef) }
						// return { ...pos, valueNoKoef: (value ), value: Math.round(value * pos.finalKoef * 100) / 100 }
					}
					// МЕЖЕТАЖКНОЕ
					// утепление  - 100  
					if ((fixed_id === '18_3') && ['19_3'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k19_3_mezh_utep100' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }	
					}
					// утепление  - 50 
					if ((fixed_id === '18_5') && ['19_5'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k19_5_mezh_utep50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }				}
					// фанера
					if ((fixed_id === '18_7') && ['19_9'].includes(pos.fixed_id) ) {
						return { ...pos, valueNoKoef: (value ), value: Math.ceil(value * pos.finalKoef) }
						// return { ...pos, valueNoKoef: (value ), value: Math.round(value * pos.finalKoef * 100) / 100 }
					}
					// ЧЕРДАЧНОЕ
					// утепление  - 100
					if ((fixed_id === '20_3') && ['21_3'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k21_3_cherd_utep100' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }	
					}
					// утепление  - 50 
					if ((fixed_id === '20_5') && ['21_5'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k21_5_cherd_utep50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 }	
					}
					// АНТРЕСОЛЬ
					// утепление  - 100  
					if ((fixed_id === '27_3') && ['28_3'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k28_3_antres_utep100' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 } }
					// утепление  - 50 
					if ((fixed_id === '27_7') && ['28_5'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k28_5_antres_utep50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 } }
					// фанера
					if ((fixed_id === '27_6') && ['28_9'].includes(pos.fixed_id) ) {
						return { ...pos, valueNoKoef: (value ), value: Math.ceil(value * pos.finalKoef) }
						// return { ...pos, valueNoKoef: (value ), value: Math.round(value * pos.finalKoef * 100) / 100 }
					}
					//  МЕЖК ПЕРЕГОРОДКИ - уткплитель
					if ((fixed_id === '22_2') && ['23_2'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k23_2_utepl' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 } }
					//  МЕЖК ПЕРЕГОРОДКИ - уткплитель 50
					if ((fixed_id === '22_3') && ['23_10'].includes(pos.fixed_id) ) {
						const balancer = docKoefs.find((koef: any) => koef.koef_code == 'k23_2_utepl_50' && koef.is_balancer)
						return { ...pos, valueNoKoef: (value), value: Math.round( Math.ceil(value * pos.finalKoef / balancer.value ) * balancer.value * 1000) / 1000 } }

					return pos
				})
			});
			try {
				handleInputChange();
			} catch (error) {
				console.error('Error updating positions:', error)
			}
	}

	const handleKoefNameChange = (id: number, pos_id: number, koef_code: string, is_balancer: boolean, value: string) => {
		let updatedKoefs: any[] = [];
		
		setDocKoefs((koefs: any[]) => {
			updatedKoefs = koefs.map((koef: any) => {
				if (koef.id === id) {
					return { ...koef, name: value };
				}
				return koef;
			});

			return updatedKoefs;
		});

		handleInputChange();
	};

	const handleKoefChange = (id: number, pos_id: number, koef_code: string, is_balancer: boolean, value: any) => {
		// console.log('handleKoefChange', id, pos_id, koef_code, is_balancer, value)
		let updatedKoefs: any[] = [];

		let newValue = value
		if ( value !== '') {
			newValue = parseFloat(value)
		}
		
		setDocKoefs((koefs: any[]) => {
			updatedKoefs = koefs.map((koef: any) => {
				if (koef.id === id) {
					return { ...koef, value: newValue };
				}
				return koef;
			});

			let hasBalancer = false
			const newKoef: number = updatedKoefs
			.filter((koef: any) => koef.koef_code === koef_code)
			.reduce((finalKoef: number, koef: any) => {
				if (koef.is_balancer) {
					hasBalancer = true
					// console.log('finalKoef3 ', finalKoef)
					return finalKoef;
					// return Math.round(finalKoef * 1 * 100) / 100;
				}
				if (koef.is_divider) {
					if (koef.value == 0 || koef.value == '') return 0;
					// console.log('finalKoef2 ', finalKoef)
					return finalKoef / koef.value;
					// return Math.round(finalKoef / koef.value * 100) / 100;
				}
				// return finalKoef * koef.value;
				// console.log('finalKoef 1', finalKoef)
				return finalKoef * koef.value
			}, 1)

			setPositions((positions: any[]) => {
				return positions.map((pos: any) => {
					if (pos.id === pos_id) {
						// рассчитываем измененную позицию, в которой меняли кэфы
						let balancerVal = 1
						
						if (hasBalancer) {
							if (is_balancer) {
								// берем значение тек.инпута - он и есть балансер
								balancerVal = newValue
							} else {
								// ищем балансер в группе кэфов
								let balancer = docKoefs.find((koef: any) => koef.koef_code == koef_code && koef.is_balancer)
								balancerVal = balancer.value
							}
							// console.log('CASE-1') // skipping
							return { ...pos, value: Math.round( Math.ceil(pos.valueNoKoef * newKoef / balancerVal) * balancerVal * 1000) / 1000, finalKoef: newKoef } // orig
						} else if (pos.koef_code == 'k11_3_doska') {
							return { ...pos, value: Math.round(pos.valueNoKoef * newKoef * 100) / 100, finalKoef: newKoef }
						}
						// else if (pos.koef_code == 'k17_13_fanera' || pos.koef_code == 'k19_9_fanera' || pos.koef_code == 'k28_9_antres_fanera' ||
						// 	pos.koef_code == 'k7_2_okraska' || pos.koef_code ==  'k9_1_orkaska_fasad'|| pos.koef_code == 'k9_2_orkaska_perer') {
						// 	console.log('CASE-2')
						// 	return { ...pos, value: Math.ceil(pos.valueNoKoef * newKoef), finalKoef: newKoef }
						// }
	
						// } else if (pos.koef_code == 'k7_2_okraska' || 'k9_1_orkaska_fasad' || 'k9_2_orkaska_perer') {
						else if (pos.koef_code == 'k7_2_okraska') {
							// console.log('pos.valueNoKoef', pos.valueNoKoef)
							// console.log('finalKoef', newKoef)
							// find position
							return { ...pos, value: Math.round(pos.valueNoKoef * newKoef * 1.68 * 100) / 100, finalKoef: newKoef }
						} 
						// console.log('CASE-4')
						return { ...pos, value: Math.ceil(pos.valueNoKoef * newKoef), finalKoef: newKoef }
						// return { ...pos, value: Math.round(pos.valueNoKoef * newKoef * 100) / 100, finalKoef: newKoef }
					}
					return pos;
				})
			})

			return updatedKoefs;
		});
		
		handleInputChange();
	};


	// для коэф. ФИКС расход, фикс К1, К2  = используются в рассчетах ИТОГО
	const handleKoefChangeByName = (name: string, value: any) => {
		if (value !== '') {
			value = parseFloat(value)
		} else {
			// value = 0
		}
		let updatedKoefs: any[] = [];
		setDocKoefs((koefs: any[]) => {
			updatedKoefs = koefs.map((koef: any) => {
				if (koef.name === name) {
					return { ...koef, value };
				}
				return koef;
			});
			return updatedKoefs;
		});		
		handleInputChange();
	}

	useEffect(() => {
		if(positions) {

			const positionSum = (id: number) => {
				const pos = positions.find((pos:any) => pos.id === id)
				return Math.round(pos.value * pos.price)
			}
			
			const sumAll = (positions: any) => {
				return Math.round(
					positions.reduce((sum: any, pos: any) => sum + pos.value * pos.price, 0)
				)
			}

			const updateSums = () => {

				// ДИНАМИЧЕСКИЙ ПОДСЧТЕТ ОТДЕЛЬНЫх ПОЗИЦИЙ В ПРАЙСЕ, В ТЧ КОЭФФИЦИЕНТОВ

				// ИТОГО - КОЭФФИЦИЕНТЫ 1 И 2 + ФИКС СУММА РАСХОДЫ 1 И 2 
				const koef1_data = docKoefs.find((koef: any) => koef.koef_code == 'koef1')
				const koef2_data = docKoefs.find((koef: any) => koef.koef_code == 'koef2')
				const rashReal1_data = docKoefs.find((koef: any) => koef.koef_code == 'rashReal1')
				const rashReal2_data = docKoefs.find((koef: any) => koef.koef_code == 'rashReal2')
				const koef1 = koef1_data.value
				const koef2 = koef2_data.value
				const rashReal1 = rashReal1_data.value
				const rashReal2 = rashReal2_data.value
		
				// ФУНДАМЕНТ
				const fund_pos = positions.filter((pos: any) => pos.code == 1)

				const sum1_1 = positionSum(fund_pos[0].id) + positionSum(fund_pos[1].id) + positionSum(fund_pos[2].id) + positionSum(fund_pos[4].id) + positionSum(fund_pos[5].id)   // Сумма работ фундамент
				const sum1_2 = positionSum(fund_pos[3].id) + positionSum(fund_pos[6].id) + positionSum(fund_pos[8].id)  // Материалы без чеков
				const sum1_3 = positionSum(fund_pos[7].id) + positionSum(fund_pos[9].id) // Сумма материалов с чеками
				const sum1_4 = sum1_2 + sum1_3 // Все Материалы без наценки
				const sum1_5 = sum1_1 + sum1_4 // Все затраты на фундамент
				const sum1_6 = Math.round(sum1_5 * 0.3) // Прибыль с фундамента
				const sum1_7 = sum1_5 + sum1_6 // Итого фундамент:
				
				const sum1_8 = sum1_7 - sum1_3 // Сумма налогообложения
				const sum1_9 = Math.round(sum1_8 * 0.15) // Налоги
				const sum1_10 = sum1_6 - sum1_9 // Чистая прибыль
				
				// СТЕН КОМПЛЕКТ, КРОВЛЯ
				const sum2_1 = sumAll(positions.filter((pos: any) => pos.code == 2)) // стеновой комплект
				const sum3_1 = sumAll(positions.filter((pos: any) => pos.code == 3)) // стеновой комплект материалы
				const sum4_1 = sumAll(positions.filter((pos: any) => pos.code == 4)) // кровля
				const sum5_1 = sumAll(positions.filter((pos: any) => pos.code == 5)) // кровля материалы
				const sum5_2 = Number(sum1_2) // плюс доска на леса !!!
				
				// ЧАСТЬ 1 РАСЧЕТ
				const korobka_itogo_rab = sum2_1 + sum4_1
				const korobka_itogo_mat_bn =  sum3_1 + sum5_1
				// const korobka_zp_tehno_bf = sum4_1 + sum3_1
				const korob_itogo_mat_sn = Math.round(korobka_itogo_mat_bn * koef1)
				const korob_raboty_rab = korobka_itogo_rab * 0.6
				const korob_prib_s_mat = Math.round(korobka_itogo_mat_bn * koef1) - korobka_itogo_mat_bn
				const korob_prib_s_rab = sum2_1 + sum4_1 - korob_raboty_rab
				const korobka_itogo_rab_bez_f = sum2_1 + sum4_1 + korob_itogo_mat_sn
				const korobka_itogo_rab_s_f = sum2_1 + sum4_1 + korob_itogo_mat_sn + sum1_7

				// const korob_korob_nalog_bf =  korobka_itogo_rab + korob_itogo_mat_sn - korobka_itogo_mat_bn - rashReal1
				const korob_korob_nalog_bf =  korobka_itogo_rab_bez_f - korobka_itogo_mat_bn - korob_raboty_rab - rashReal1
				const korob_nalog =  Math.round(korob_korob_nalog_bf * 0.09)
				const korob_nalog_sf = (korob_nalog) + (sum1_9)

				const korob_zp_magager_sf = Math.round(korobka_itogo_rab_s_f * 0.01)
				const korob_zp_tehno_sf = Math.round(korobka_itogo_rab_s_f * 0.01)
				const korob_zp_magager_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)
				const korob_zp_tehno_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)

				const prib_bez_fund = Math.round(korobka_itogo_rab_bez_f - korobka_itogo_mat_bn - korob_raboty_rab - rashReal1 - korob_nalog - korob_zp_magager_bf - korob_zp_tehno_bf )
				const prib_s_fund = Math.round(korobka_itogo_rab_s_f - korobka_itogo_mat_bn - korob_raboty_rab - rashReal1 - korob_nalog_sf - sum1_1 - sum1_2 - sum1_3 - korob_zp_magager_sf - korob_zp_tehno_sf )
				
				// Накладные расходы и доставки, расчет мат без чеков
				const nakl_rash_dost = positions.find((pos: any) => pos.fixed_id === '3_19')
				// console.log('nakl_rash_dost', nakl_rash_dost.value * nakl_rash_dost.price)
				const mat_bez_chekov_s_fund = sum1_2 + ((nakl_rash_dost.value * nakl_rash_dost.price) /2)

				// ФАСАД
				/* 132? */ const sum6_1 = sumAll(positions.filter((pos: any) => pos.code == 6)) // Свесы кровли работы
				/*  */ const sum7_1 = sumAll(positions.filter((pos: any) => pos.code == 7)) // Свесы кровли - Материалы
				/* 145 */ const sum8_1 = sumAll(positions.filter((pos: any) => pos.code == 8)) // 8 Окраска фасада - работы
				/* 153 */ const sum9_1 = sumAll(positions.filter((pos: any) => pos.code == 9)) // 9 Окраска фасада - Материалы
				/* 159 */ const sum10_1 = sumAll(positions.filter((pos: any) => pos.code == 10)) // 10 Терраса - работы
				/* 167 */ const sum11_1 = sumAll(positions.filter((pos: any) => pos.code == 11)) // 11 Терраса - Материалы

				// ОКНА, УТ. КРОВЛИ
				/* 177 */ const sum12_1 = sumAll(positions.filter((pos: any) => pos.code == 12)) // 12 Утепления кровли - работы
				/* 190 */ const sum13_1 = sumAll(positions.filter((pos: any) => pos.code == 13)) // 13 Утепления кровли - Материалы
				/* 201 */ const sum14_1 = sumAll(positions.filter((pos: any) => pos.code == 14)) // 14 Двери Окна -  работы
				/* 220 */ const sum15_1 = sumAll(positions.filter((pos: any) => pos.code == 15)) // 15 Двери Окна - Материалы
				
				// ПЕРЕКРЫТИЯ
				/* 234 */ const sum16_1 = sumAll(positions.filter((pos: any) => pos.code == 16)) // 16 Полы 1 этаж - работы
				/* 252 */ const sum17_1 = sumAll(positions.filter((pos: any) => pos.code == 17)) // 17 Полы 1 этаж - Материалы
				/* 262 */ const sum18_1 = sumAll(positions.filter((pos: any) => pos.code == 18)) // 18 Межэтажное перекрытия - работы
				/* 276 */ const sum19_1 = sumAll(positions.filter((pos: any) => pos.code == 19)) // 19 Межэтажное перекрытия - Материалы
				/* 286 */ const sum20_1 = sumAll(positions.filter((pos: any) => pos.code == 20)) // 20 Чердачное перекрытия работы
				/* 300!+антр */ const sum21_1 = sumAll(positions.filter((pos: any) => pos.code == 21)) // 21 Чердачное перекрытия - Материалы
				/*  */ const sum27_1 = sumAll(positions.filter((pos: any) => pos.code == 27)) // 27 Перекрытия антресоль работы
				/*  */ const sum28_1 = sumAll(positions.filter((pos: any) => pos.code == 28)) // 28 Перекрытия антресоль - Материалы
				
				// МЕЖК.ПЕРЕКРЫТИЯ
				/* 311 */ const sum22_1 = sumAll(positions.filter((pos: any) => pos.code == 22)) // 22 Межкомнатные перегородки - работы
				/* 324 */ const sum23_1 = sumAll(positions.filter((pos: any) => pos.code == 23)) // 23 Межкомнатные перегородки - Материалы
				
				// ИНЖ КОММ цены закупа
				const sum29_1 = sumAll(positions.filter((pos: any) => pos.code == 29)) // 29 Инженерные коммуникации закуп
				// ИНЖ КОММ ЦЕНЫ наши
				const sum30_1 = sumAll(positions.filter((pos: any) => pos.code == 30)) // 30 Инженерные коммуникации наши
				const prib_kommunik = sum30_1 - sum29_1
				// НАКЛАДНЫЕ
				const sum24_1 = sumAll(positions.filter((pos: any) => pos.code == 24)) // 24 Доставка материалов
				const sum25_1 = sumAll(positions.filter((pos: any) => pos.code == 25)) // 25 Проживание, питание
				const sum26_1 = sumAll(positions.filter((pos: any) => pos.code == 26)) // 26 СКИДКИ

				// ЧАСТЬ 2 РАСЧЕТ - koef2
				const fasad_itogo = sum6_1 + Math.round(sum7_1 * koef2) + sum8_1 + Math.round(sum9_1 * koef2) + sum10_1 + Math.round(sum11_1 * koef2)
				const okna_itogo =  sum12_1 + Math.round(sum13_1 * koef2) + sum14_1 + Math.round(sum15_1 * koef2)
				const perekr_itogo =  sum16_1 + Math.round(sum17_1 * koef2) + sum18_1 + Math.round(sum19_1 * koef2) + sum20_1 + Math.round(sum21_1 * koef2) + sum27_1 + Math.round(sum28_1 * koef2)
				const mkperekr_itogo = sum22_1 + Math.round(sum23_1 * koef2)
				const nakladnie_itogo = sum24_1 + sum25_1 - sum26_1

				// ЧАСТЬ 2 ИТОГО

				// 27_1 работы антресоль
				const itogo_rab_v_tk =  sum27_1 + sum22_1 + sum20_1 + sum18_1 + sum16_1 + sum14_1 + sum12_1 + sum10_1 + sum8_1 + sum6_1
				// const itogo_rab_v_tk =  sum22_1 + sum20_1 + sum18_1 + sum16_1 + sum14_1 + sum12_1 + sum10_1 + sum8_1 + sum6_1

				// 29_1 инженерные коммуникации 28_1 материалы антресоль
				// upd - убраны инж.комм sum29_1
				const itogo_mat_v_tk_bn = sum28_1 + sum23_1 + sum21_1 + sum19_1 + sum17_1 + sum15_1 + sum13_1 + sum11_1 + sum9_1 + sum7_1
				// const itogo_mat_v_tk_bn = sum23_1 + sum21_1 + sum19_1 + sum17_1 + sum15_1 + sum13_1 + sum11_1 + sum9_1 + sum7_1

				// upd - добавлены инж комм цены sum30_1
				const itogo_mat_sn = Math.round((itogo_mat_v_tk_bn * koef2))
				const mat_bez_chekov = nakladnie_itogo
				const raboty_rabotnikov =  Math.round(itogo_rab_v_tk * 0.6)
				const prib_s_mat = itogo_mat_sn - itogo_mat_v_tk_bn + prib_kommunik
				const prib_s_rab = itogo_rab_v_tk - raboty_rabotnikov

				const itogo_rab_i_mat_po_dog_vtk = itogo_rab_v_tk + itogo_mat_sn + sum30_1 + nakladnie_itogo
				// mat_bez_chekov NO
				const itogo_rab_po_dog_vtk_pod_krish_bez_fund =  itogo_rab_i_mat_po_dog_vtk + korobka_itogo_rab_bez_f
				// const itogo_rab_po_dog_vtk_pod_krish_bez_fund =  itogo_rab_i_mat_po_dog_vtk + korobka_itogo_rab_bez_f + mat_bez_chekov
				const itogo_rab_po_dog_vtk_pod_krish_s_fund = itogo_rab_po_dog_vtk_pod_krish_bez_fund + sum1_7
				
				// const itogo_minus_sebest = itogo_rab_po_dog_vtk_pod_krish_s_fund - 
				const zp_v_tk_manager_podkr_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)
				const zp_v_tk_technodzor_podkr_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)
				const zp_v_tk_manager_podkr_sf = Math.round(korobka_itogo_rab_s_f * 0.01)
				const zp_v_tk_technodzor_podkr_sf = Math.round(korobka_itogo_rab_s_f * 0.01)

				const zp_v_tk_manager_bf = Math.round((itogo_rab_po_dog_vtk_pod_krish_bez_fund - sum25_1 - sum24_1) * 0.01)
				const zp_v_tk_tehnodzor_bf = Math.round((itogo_rab_po_dog_vtk_pod_krish_bez_fund - sum25_1 - sum24_1) * 0.01)

				const zp_v_tk_manager_sf = Math.round((itogo_rab_po_dog_vtk_pod_krish_s_fund - sum25_1 - sum24_1) * 0.01)
				const zp_v_tk_tehnodzor_sf = Math.round((itogo_rab_po_dog_vtk_pod_krish_s_fund - sum25_1 - sum24_1) * 0.01)

				const zp_v_tk_manager_last = Math.round(itogo_rab_i_mat_po_dog_vtk * 0.01)
				const zp_v_tk_tehnodzor_last = Math.round(itogo_rab_i_mat_po_dog_vtk * 0.01)

				// rashod_real
				// const summa_nalogoobl = itogo_rab_i_mat_po_dog_vtk - itogo_mat_v_tk_bn - rashReal2
				const summa_nalogoobl = itogo_rab_i_mat_po_dog_vtk - itogo_mat_v_tk_bn - rashReal2 - sum29_1 - raboty_rabotnikov
				// const nalog = Math.round(summa_nalogoobl * 0.075)
				const nalog = Math.round(summa_nalogoobl * 0.09)
				const pribil_v_tk = itogo_rab_i_mat_po_dog_vtk - nalog - rashReal2 - itogo_mat_v_tk_bn - raboty_rabotnikov - mat_bez_chekov - zp_v_tk_manager_last - zp_v_tk_tehnodzor_last - sum29_1
				
				// const pribil_v_tk = itogo_rab_i_mat_po_dog_vtk - nalog - rashReal2 - itogo_mat_v_tk_bn - raboty_rabotnikov - mat_bez_chekov - zp_v_tk_manager_bf - zp_v_tk_tehnodzor_bf - sum29_1
				// const pribil_v_tk_pk_bf = Math.round(pribil_v_tk + prib_bez_fund - zp_v_tk_manager - zp_v_tk_tehnodzor)
				const pribil_v_tk_pk_bf = Math.round(pribil_v_tk + prib_bez_fund)
				// const pribil_v_tk_pk_sf = Math.round(pribil_v_tk + prib_s_fund - zp_v_tk_manager - zp_v_tk_tehnodzor)
				const pribil_v_tk_pk_sf = Math.round(pribil_v_tk + prib_s_fund)
				// const sebest_v_tk_sf = Math.round(sum1_5 + korobka_itogo_rab + korob_raboty_rab + rashReal1 + korob_nalog_sf + itogo_mat_v_tk_bn + mat_bez_chekov + raboty_rabotnikov + rashReal2 + nalog + zp_v_tk_manager_sf + zp_v_tk_tehnodzor_sf)
				const sebest_v_tk_sf_new = Math.round(sum1_5 + korobka_itogo_mat_bn + korob_raboty_rab + rashReal1 + korob_nalog_sf    + itogo_mat_v_tk_bn + raboty_rabotnikov + rashReal2 + nalog + mat_bez_chekov + zp_v_tk_manager_sf + zp_v_tk_tehnodzor_sf + sum29_1 )
				// const itogo_rabot_minus_sebest = Math.round(itogo_rab_po_dog_vtk_pod_krish_s_fund - sebest_v_tk_sf)
				const itogo_rabot_minus_sebest = Math.round(itogo_rab_po_dog_vtk_pod_krish_s_fund - sebest_v_tk_sf_new)

				setSums({ sum1_1, sum1_2, sum1_3, sum1_4, sum1_5, sum1_6, sum1_7, sum1_8, sum1_9, sum1_10, sum2_1, sum3_1, sum4_1, sum5_1, sum5_2, 
					korobka_itogo_rab, korobka_itogo_mat_bn, korob_itogo_mat_sn, korob_raboty_rab, korob_prib_s_mat, korob_prib_s_rab, korobka_itogo_rab_bez_f, korobka_itogo_rab_s_f,
					korob_korob_nalog_bf, korob_nalog, korob_nalog_sf, korob_zp_magager_sf, korob_zp_tehno_sf, korob_zp_magager_bf, korob_zp_tehno_bf, prib_bez_fund, prib_s_fund,
					fasad_itogo, okna_itogo, perekr_itogo, mkperekr_itogo, nakladnie_itogo,
					sum6_1, sum7_1, sum8_1, sum9_1, sum10_1, sum11_1, sum12_1, sum13_1, sum14_1, sum15_1, sum16_1, sum17_1, sum18_1, sum19_1, sum20_1, sum21_1, sum22_1, sum23_1, sum24_1, sum25_1, sum26_1, sum27_1, sum28_1,
					itogo_rab_v_tk, itogo_mat_v_tk_bn, itogo_mat_sn, mat_bez_chekov, raboty_rabotnikov, prib_s_mat, prib_s_rab, itogo_rab_i_mat_po_dog_vtk, itogo_rab_po_dog_vtk_pod_krish_bez_fund, itogo_rab_po_dog_vtk_pod_krish_s_fund,
					pribil_v_tk, nalog,  zp_v_tk_manager_podkr_bf, zp_v_tk_technodzor_podkr_bf, zp_v_tk_manager_podkr_sf, zp_v_tk_technodzor_podkr_sf, summa_nalogoobl, pribil_v_tk_pk_bf, pribil_v_tk_pk_sf, sebest_v_tk_sf_new, itogo_rabot_minus_sebest, zp_v_tk_manager_bf, zp_v_tk_tehnodzor_bf,
					zp_v_tk_manager_sf, zp_v_tk_tehnodzor_sf, rashReal1, rashReal2, koef1, koef2, sum29_1, sum30_1, prib_kommunik, zp_v_tk_tehnodzor_last, zp_v_tk_manager_last, mat_bez_chekov_s_fund
					
				 }); 
				 
				};
				
				updateSums();
				
			}
		}, [positions, docKoefs]);
		

	// generating unique id for new position
	const usedIds = new Set();
	function generateUniqueId(): number {
		let id;
		do {
			id = Math.floor(Math.random() * 10000) + 1;
		} while (usedIds.has(id));
		
		usedIds.add(id);
		return id;
	}
	
	// create new position for db
	const newPos = {
		id: generateUniqueId(),
		name: '--',
		price: 0,
		value: 0,
		measure: '--', 
		new_pos: true
	}
	
	const createPosition = (code: number) => {
		handlePosCreate(newPos.id, newPos.name, newPos.price, newPos.value, newPos.measure, code, newPos.new_pos)
	}

	return (
		<>
			{isDeletePositionModalOpen && selectedPosition && <ModalDeletePosition projectId={proj_id} positionId={selectedPosition} onClose={()=>setIsDeletePositionModalOpen(false)} />}
			
			<div className='bg-white flex flex-col max-w-screen-2xl mx-auto w-full mb-6'>
				<div className='bg-white sticky top-0 z-100'>
					<div className='flex flex-row px-5 py-4  mt-5 border border-b-0 bg-white rounded-t-xl '>
						<div className=''>
							<div className='flex flex-row gap-2'>
								<Link href='/' className='my-auto'>
									<svg className="my-auto size-5 rotate-180 " xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"></path></svg>
								</Link>
								<h2 className='text-xl font-bold '>{projectInfo && projectInfo.name}</h2>
							</div>
							<div className='text-gray-500'>{projectInfo && projectInfo.description}</div>
						</div>
						<div className='ml-auto my-auto flex gap-2'>
							<div onClick={toggleProjectInfo} className=' px-3 py-2 text-lg border rounded-lg  hover:bg-gray-100 cursor-pointer'>
								<Cog6ToothIcon className='w-5' />
							</div>
							<button onClick={saveProject} className='text-white px-3 py-2 text-sm border border-transparent font-semibold bg-blue-600 rounded-lg disabled:opacity-40' disabled={!formChanged}>Сохранить</button>
							{formChanged === 2 && <div className='my-auto text-sm'>⚠️</div>}
							{formChanged === 3 && <div className='my-auto text-sm'>⏱️</div>}
							{/* {formChanged === 4 && <div className='my-auto text-xs'>⚠️ Проект был изменен. Обновите страницу. </div>} */}
						</div>
					</div>
					<div id='project-info' className={`border border-b-0 flex flex-col px-6 pt-6 pb-8 text-sm gap-4 transition-all duration-500 ease-in-out ${isProjectInfoOpen ? 'hidden' : ''}`}>
						<div className='flex gap-8'>
							<div className='flex w-full flex-col'>
								<span>Номер договора</span>
								<input name='dog_num' onChange={handleOrderChange('dog_num')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.dog_num} />
							</div>
							<div className='flex w-full flex-col'>
								<span>Название</span>
								<input name='name' onChange={handleOrderChange('name')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.name} />
							</div>
							<div className='flex w-full flex-col'>
								<span>Описание</span>
								<input name='description' onChange={handleOrderChange('description')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.description} />
							</div>
						</div>
						<div className='flex gap-8'>
							<div className='flex w-full flex-col'>
								<span>Имя клиента</span>
								<input name='client' onChange={handleOrderChange('client')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.client} />
							</div>
							<div className='flex w-full flex-col'>
								<span>Телефон</span>
								<input name='phone1' onChange={handleOrderChange('phone1')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.phone1} />
							</div>
							<div className='flex w-full flex-col'>
								<span>Адрес</span>
								<input name='location' onChange={handleOrderChange('location')} className=' mt-2 w-full max-w-full py-2 px-3 rounded-lg border my-auto' type="text" defaultValue={projectInfo && projectInfo.location} />
							</div>
						</div>
					</div>

					<div className='flex flex-row w-full px-5 py-2 border uppercase text-xs font-semibold bg-gray-50 text-black'>
						<div className='w-7/12 my-auto'>Наименование</div>
						<div className='w-1/12 my-auto mx-1'>Ед.изм</div>
						<div className='w-1/12 my-auto'>Кол-во</div>
						<div className='w-1/12 my-auto'>Цена</div>
						<div className='w-2/12 my-auto'>Сумма</div>
						{/* <div className='w-1/12 my-auto'>Чек</div> */}
						{/* <div className='w-1/12 my-auto opacity-20'>Коэф.</div> */}
					</div>
				</div>

			{/* СКЕЛЕТОН */}
			{!positions && [...Array(25)].map((_, index) => (
				<div key={index} className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm -z-1'>
					<div className='w-7/12 my-auto flex-row flex'>
						<div className="rounded-l rounded-r bg-gray-200 h-5 w-1/2 animate-pulse"></div>
					</div>
					<div className='w-5/12 my-auto flex-row flex'>
						<div className="rounded-l rounded-r bg-gray-200 h-5 w-3/4 animate-pulse "></div>
					</div>
				</div>
      		))}

			{/* Коробка  */}
				
				{/* 1. Этап — Фундамент */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Фундамент свайно-винтовой </div>
				</div> }
				{positions && positions.filter((position: any) => position.code == 1).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`}
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

					
				{positions && sums && 
				<>
					{user_id == 1 && <div className='bg-slate-100'>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Сумма работ фундамент:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_1)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Материалы без чеков:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_2)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Сумма материалов с чеками:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_3)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Все Материалы без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_4)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Все затраты на фундамент:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_5)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_6)}</div>
					</div></div>}

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого фундамент:</div>
						<div className='w-3/12 my-auto ' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_7)}</div>
					</div>
					
					{user_id == 1 && <div className='bg-lime-100'>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Сумма налогообложения:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_8)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Налоги:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_9)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Чистая прибыль:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum1_10)}</div>
					</div>
					</div>}
				</>	
				}


				{/* 2. Этап — Стеновой комплект */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Стеновой комплект - Работы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 2).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				{/* <Position key={generateUniqueId()} position={{ ...emptyPos, id: generateUniqueId() , code: 2 }} handlePosChange={handlePosChange} /> */}
				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(2)}>+</button>

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum2_1)}</div>
					</div>
				</>	
				}

				
				{/* Этап 2 - Стеновой комплект - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Стеновой комплект - Материалы</div>
				</div>}
				
				{positions && positions.filter((position: any) => position.code == 3).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(3)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6'>
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum3_1 * sums.koef1))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Материалы без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum3_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 ' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum2_1 + Math.round(sums.sum3_1 * sums.koef1))}</div>
					</div>
				</>	
				}

				{/* Этап 3 - Кровля */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Кровля - Работы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 4).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(4)}>+</button>

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum4_1)}</div>
					</div>
				</>	
				}
				
				{/* Этап 3 - Кровля - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Кровля - Материалы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 5).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(5)}>+</button>

				

			{/* кровля материалы = Большое итого - 1 */}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum5_1 * sums.koef1))}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum4_1 + Math.round(sums.sum5_1 * sums.koef1))}</div>
					</div>
					{user_id == 1 && <div className='bg-slate-100'>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 ' >
						<div className='w-9/12 my-auto text-right font-bold'>Материалы кровли без наценки :</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum5_1)}</div>
					</div>

					{/* <div className='flex flex-row w-full px-5 py-4  border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>---</div>
						<div className='w-3/12 my-auto' id=''></div>
					</div> */}
					
					<div className='flex flex-row w-full h-0.5 bg-slate-300' ></div>

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korobka_itogo_rab)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korobka_itogo_mat_bn)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-2 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Наценка:</div>
						<div className='w-3/12 my-auto'>
							<input name='koef1' onChange={(e) => handleKoefChangeByName('koef1', e.target.value )} className='no-num-arrows w-28 py-2 px-3 rounded-lg border my-auto' defaultValue={sums.koef1}
								type="number"
								onWheel={(e) => (e.target as HTMLInputElement).blur()}
								step="any"
								onKeyDown={(event) => {
								if (!/[0-9.]/.test(event.key) && 
									event.key !== 'Backspace' && 
									event.key !== 'Delete' && 
									event.key !== 'ArrowLeft' && 
									event.key !== 'ArrowRight' && 
									event.key !== 'Tab') {
									event.preventDefault();
								}
								}}
							/>
						</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы с наценкой:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_itogo_mat_sn)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Материалы без чеков с фундамента:</div>
						{/* <div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum5_2)}</div> */}
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.mat_bez_chekov_s_fund)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Работы работников:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_raboty_rab)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_prib_s_mat)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_prib_s_rab)}</div>
					</div>
					</div>}

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ и материалов без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korobka_itogo_rab_bez_f)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по договору + фундамент:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korobka_itogo_rab_s_f)}</div>
					</div>
					{user_id == 1 && <div className='bg-slate-100'>
					<div className='flex flex-row w-full px-5 py-2 border border-t-0 text-sm gap-6 ' >
						<div className='w-9/12 my-auto text-right font-bold'>Расход реальный для налоговой; Налоги раб,ЗП,аренда,реклама,Прочии расходы:</div>
						<div className='w-3/12 my-auto'>
							<input name='rashReal1' onChange={(e) => handleKoefChangeByName('rashReal1', e.target.value )} className='no-num-arrows w-28 py-2 px-3 rounded-lg border my-auto' defaultValue={sums.rashReal1} 
								type="number"
								onWheel={(e) => (e.target as HTMLInputElement).blur()}
								step="any"
								onKeyDown={(event) => {
								if (!/[0-9.]/.test(event.key) && 
									event.key !== 'Backspace' && 
									event.key !== 'Delete' && 
									event.key !== 'ArrowLeft' && 
									event.key !== 'ArrowRight' && 
									event.key !== 'Tab') {
									event.preventDefault();
								}
								}}
							/>
						</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Сумма налогооблажения без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_korob_nalog_bf)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Налог:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_nalog)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Налог с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_nalog_sf)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль под крышу без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.prib_bez_fund)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль под крышу с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.prib_s_fund)}</div>
					</div>
					</div>}

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Зараплата менеджера с учетом фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_zp_magager_sf)}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата технодзора с учетом фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_zp_tehno_sf)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Зараплата менеджера без учета фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_zp_magager_bf)}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата технодзора без учета фундамента :</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.korob_zp_tehno_bf)}</div>
					</div>
					</>}
				</>	
				}
				

			{/* Фасад */}
				{/* {positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Фасад - </div>
				</div>} */}

				{/* Этап 1 - Свесы кровли работы  */}

				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Свесы кровли - Работы</div>
				</div>

				{positions && positions.filter((position: any) => position.code == 6).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(6)}>+</button>

				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum6_1)}</div>
					</div>
				</>	
				}

				{/* Этап 1 - Свесы кровли - Материалы  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Свесы кровли - Материалы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 7).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(7)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum7_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum7_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum6_1 + Math.round(sums.sum7_1 * sums.koef2))}</div>
					</div>
				</>	
				}


				{/* Этап 2 - Окраска фасада   */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Окраска фасада - Работы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 8).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>


					))}
				</div>
				))}
				
				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(8)}>+</button>

				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum8_1)}</div>
					</div>
				</>	
				}

				{/* Этап 2 - Окраска фасада - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Окраска фасада - Материалы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 9).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>


					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(9)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum9_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum9_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum9_1 * sums.koef2) + sums.sum8_1)}</div>
					</div>
				</>	
				}

				{/* Этап 3 - Терраса */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Терраса - Работы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 10).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(10)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum10_1)}</div>
					</div>
				</>	
				}

				{/* Этап 3 - Терраса - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Терраса - Материалы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 11).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(11)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum11_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum11_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum10_1 + Math.round(sums.sum11_1 * sums.koef2))}</div>
					</div>
					{/* <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого фасад:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.fasad_itogo)}</div>
					</div> */}
				</>	
				}

		
			{/* Окна и утепления кровли */}
				{/* {positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Окна и утепления кровли </div>
				</div>} */}
				
				{/* Этап 1 - Утепления кровли */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Утепления кровли - Работы</div>
				</div> }

				{positions && positions.filter((position: any) => position.code == 12).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(12)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum12_1)}</div>
					</div>
				</>	
				}

				{/* Этап 1 - Утепления кровли - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Утепления кровли - Материалы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 13).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(13)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum13_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum13_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum12_1 + Math.round(sums.sum13_1 * sums.koef2))}</div>
					</div>
				</>	
				}

				{/* Этап 2 - Двери Окна */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Двери Окна - Работы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 14).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(14)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum14_1)}</div>
					</div>
				</>	
				}

				{/* Этап 2 - Двери Окна - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Двери Окна - Материалы  </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 15).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(15)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum15_1 *sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum15_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum14_1 + Math.round(sums.sum15_1 * sums.koef2))}</div>
					</div>
					{/* <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого окна и утепления кровли:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.okna_itogo )}</div>
					</div> */}
				</>	
				}

			{/* Перекрытия */}
				{/* {positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Перекрытия - Работы</div>
				</div>} */}
			
				{/* Этап 1 - Полы 1 этаж  */}
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Полы 1 этаж - Работы </div>
				</div>

				{positions && positions.filter((position: any) => position.code == 16).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(16)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum16_1)}</div>
					</div>
				</>	
				}

				{/* Этап 1 - Полы 1 этаж -  Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Полы 1 этаж - Материалы  </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 17).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(17)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum17_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum17_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum16_1 + Math.round(sums.sum17_1 * sums.koef2))}</div>
					</div>
				</>	
				}
				
				{/* Этап 2 - Межэтажное перекрытия  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Межэтажное перекрытия - Работы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 18).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(18)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum18_1)}</div>
					</div>
				</>	
				}

				{/* Этап 2 - Межэтажное перекрытия - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Межэтажное перекрытия - Материалы  </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 19).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(19)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum19_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum19_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum18_1 + Math.round(sums.sum19_1 * sums.koef2))}</div>
					</div>
				</>	
				}

				{/* Этап 3 - Чердачное перекрытия   */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Чердачное перекрытия - Работы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 20).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(20)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum20_1)}</div>
					</div>
				</>	
				}

				{/* Этап 3 - Чердачное перекрытия - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Чердачное перекрытия - Материалы</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 21).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(21)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum21_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum21_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum20_1 + Math.round(sums.sum21_1 * sums.koef2))}</div>
					</div>
					
				</>	
				}

				{/* Этап 4 - Перекрытия антресоль */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Перекрытия антресоль - Работы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 27).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(27)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum27_1)}</div>
					</div>
				</>	
				}

				{/* Этап 4 - Перекрытия антресоль */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Перекрытия антресоль - Материалы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 28).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(28)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum28_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum28_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum27_1 + Math.round(sums.sum28_1 * sums.koef2))}</div>
					</div>
					{/* <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого перекрытия:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.perekr_itogo)}</div>
					</div> */}
				</>	
				}

				{/* Перегородки */}
				{/* {positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Перегородки </div>
				</div>} */}

				{/* Этап 1 - Межкомнатные перегородки   */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Межкомнатные перегородки - Работы </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 22).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(22)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum22_1)}</div>
					</div>
				</>	
				}

				{/* Этап 1 - Межкомнатные перегородки - Материалы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Межкомнатные перегородки - Материалы  </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 23).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>
					))}
				</div>
				))}

				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(23)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(Math.round(sums.sum23_1 * sums.koef2))}</div>
					</div>
					{user_id == 1 && <>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum23_1)}</div>
					</div>
					</>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов и работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum22_1 + Math.round(sums.sum23_1 * sums.koef2))}</div>
					</div>
				</>	
				}

			


			{/* Инженерные комм-ии цены закупа*/}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Инженерные коммуникации - цены закупа</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 29).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого инженерные коммуникации - цены закупа:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum29_1)}</div>
					</div>
				</>	
				}

				{/* Инженерные комм-ии цены наши*/}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Инженерные коммуникации - цены наши</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 30).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого инженерные коммуникации - цены наши:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum30_1)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с комуникаций:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.prib_kommunik)}</div>
					</div>
				</>
				}



			{/* Накладные расходы */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Накладные расходы </div>
				</div>}
				{/* Доставка материалов  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Доставка материалов </div>
				</div>}
				{positions && positions.filter((position: any) => position.code == 24).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(24)}>+</button>
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого доставка:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum24_1)}</div>
					</div>
				</>	
				}

				{/* Проживание, питание */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Проживание, питание </div>
				</div>}
				{positions && positions.filter((position: any) => position.code == 25).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
				<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(25)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого проживание, питание:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum25_1)}</div>
					</div>
				</>	
				}

				{/* СКИДКИ */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Скидки</div>
				</div>}
				{positions && positions.filter((position: any) => position.code == 26).map((position: any, index: any) => (
				<div key={position.id}>
					<Position 
						docKoefs={docKoefs}
						position={position}
						handlePosChange={handlePosChange}
						uniqueId={`${position.code}_${index + 1}`} 
						toggleKoefsVisibility={toggleKoefsVisibility}
						handleDeleteClick={handleDeleteClick}
					/>
					{visibleKoefs[position.id] && docKoefs && docKoefs.filter((koef: any) => koef.koef_code == position.koef_code).map((koef: any, koefIndex: any) => (
					<div key={`koef-${koef.id}`}>
					<Koef 
						handleKoefChange={handleKoefChange}
						handleKoefNameChange={handleKoefNameChange}
						koef={koef}
						pos_id={position.id}
					/>
					</div>

					))}
				</div>
				))}
					<button className='flex flex-row w-full pl-8 py-4 border border-t-0 text-sm text-gray-400 hover:text-gray-800' onClick={() => createPosition(26)}>+</button>
				
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого скидки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum26_1)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого накладные расходы:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.nakladnie_itogo)}</div>
					</div>
				</>
				}
				<div className='flex flex-row w-full h-0.5 bg-slate-300' ></div>


				{/* ФИНАЛЬНОЕ ИТОГО */}
				{positions && sums && 
				<>
					{user_id == 1 && <div className='bg-slate-100'>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ в теплый контур:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_rab_v_tk)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалов в теплый контур без наценки:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_mat_v_tk_bn)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-2 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Наценка:</div>
						<div className='w-3/12 my-auto'>
							<input name='koef2' onChange={(e) => handleKoefChangeByName('koef2', e.target.value )} className='no-num-arrows w-28 py-2 px-3 rounded-lg border my-auto' defaultValue={sums.koef2} 
								type="number"
								onWheel={(e) => (e.target as HTMLInputElement).blur()}
								step="any"
								onKeyDown={(event) => {
								if (!/[0-9.]/.test(event.key) && 
									event.key !== 'Backspace' && 
									event.key !== 'Delete' && 
									event.key !== 'ArrowLeft' && 
									event.key !== 'ArrowRight' && 
									event.key !== 'Tab') {
									event.preventDefault();
								}
								}}
							/>
						</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого материалы с наценкой:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_mat_sn)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Материалы без чеков:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.mat_bez_chekov)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Работы работников:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.raboty_rabotnikov)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с материалов:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.prib_s_mat)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль с работ:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.prib_s_rab)}</div>
					</div>
					</div>}

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ и материалов по договору в теплый контур:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_rab_i_mat_po_dog_vtk)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по договору теплый контур+под крышу без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_rab_po_dog_vtk_pod_krish_bez_fund)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по договору теплый котур+под крышу с фунаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_rab_po_dog_vtk_pod_krish_s_fund)}</div>
					</div>

					{user_id == 1 && <div className='bg-slate-100'>
					<div className='flex flex-row w-full px-5 py-2 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Расход реальный для налоговой; Налоги раб,ЗП,аренда,реклама,Прочии расходы:</div>
						<div className='w-3/12 my-auto'>
							<input name='rashReal2' onChange={(e) => handleKoefChangeByName('rashReal2', e.target.value )} className='no-num-arrows w-28 py-2 px-3 rounded-lg border my-auto' defaultValue={sums.rashReal2} 
								type="number"
								onWheel={(e) => (e.target as HTMLInputElement).blur()}
								step="any"
								onKeyDown={(event) => {
								if (!/[0-9.]/.test(event.key) && 
									event.key !== 'Backspace' && 
									event.key !== 'Delete' && 
									event.key !== 'ArrowLeft' && 
									event.key !== 'ArrowRight' && 
									event.key !== 'Tab') {
									event.preventDefault();
								}
								}}
							/>
						</div>			
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Сумма налогооблажения:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.summa_nalogoobl)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Налог:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.nalog)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль в теплый контур:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.pribil_v_tk)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль теплый контур+под крышу без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.pribil_v_tk_pk_bf)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Прибыль теплый+под крышу+фундамент:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.pribil_v_tk_pk_sf)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
					<div className='w-9/12 my-auto text-right font-bold'>Себестоимость в теплый контур с фундаментом :</div>
					{/* <div className='w-9/12 my-auto text-right font-bold'>Себестоимость в теплый контур с фундаментом:</div> */}
					<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sebest_v_tk_sf_new)}</div>
					</div>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ минус себестоимость</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.itogo_rabot_minus_sebest)}</div>
					</div>
					</div>}

					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата в теплый контур менеджер:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_manager_last)}</div>
					</div>
					{user_id == 1 && <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата технодзора в теплый контур:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_tehnodzor_last)}</div>
					</div>}

					{/* <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата менеджера под крышу с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_manager_podkr_sf)}</div>
					</div>
					{user_id == 1 && <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата технодзора под крышу с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_technodzor_podkr_sf)}</div>
					</div>} */}


					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата менеджера теплый контур без фундамента:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_manager_bf)}</div>
					</div>
					{user_id == 1 && <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата технодзора без учета фундамента :</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_tehnodzor_bf)}</div>
					</div>}
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 ' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплата менеджера в теплый контур с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_manager_sf)}</div>
					</div>
					{user_id == 1 && <div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6 bg-slate-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Зарплат технодзора в теплый контур с фундаментом:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.zp_v_tk_tehnodzor_sf)}</div>
					</div>}
				</>
				}
			</div>
		</>
	)

}

export default Order