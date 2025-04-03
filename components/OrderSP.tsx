/* eslint-disable react/display-name */
'use client'

import { dbGetKoefs, dbGetProject } from '@/actions/Db'
import { useEffect, useState } from 'react'
import Position from './Position'

// import { Document, Packer, Paragraph, TextRun } from "docx";
// import { saveAs } from "file-saver";

const OrderSp = ({proj_id, user_id}: any) => { 

	const [positions, setPositions] = useState<any | null>(null)
	const [docKoefs, setDocKoefs] = useState<any | null>(null)
	const [sums, setSums] = useState<any | null>(null)
	const [projectInfo, setProjectInfo] = useState<any | null>(null)

	// const content = document.getElementById("content");

	// function generateDocFromDiv() {
	// 	// Получаем div по ID
	// 	const content = document.getElementById("content");
	  
	// 	if (!content) {
	// 	  console.error("Контент не найден");
	// 	  return;
	// 	}
	  
	// 	// Создаем новый документ
	// 	const doc = new Document({
	// 	  sections: [
	// 		{
	// 		  children: Array.from(content.children).map((child) => {
	// 			// Извлекаем текстовое содержимое каждого дочернего элемента
	// 			const text = child.innerText || child.textContent;
	// 			return new Paragraph({
	// 			  children: [
	// 				new TextRun({
	// 				  text: text,
	// 				  size: 24,
	// 				}),
	// 			  ],
	// 			});
	// 		  }),
	// 		},
	// 	  ],
	// 	});
	  
	// 	// Сохраняем документ как .docx
	// 	Packer.toBlob(doc).then((blob) => {
	// 	  saveAs(blob, "content.docx");
	// 	});
	// }
	  
	useEffect(() => {
		const fetchFields = async () => {
		  	const data = await dbGetProject(proj_id)
			const koefs = await dbGetKoefs(proj_id)
			setDocKoefs(koefs)
			// console.log(koefs)
		    setPositions(data?.fields)
			setProjectInfo(data)

		};
		fetchFields();
	}, [proj_id]);



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

				const korob_korob_nalog_bf =  korobka_itogo_rab + korob_itogo_mat_sn - korobka_itogo_mat_bn - rashReal1
				const korob_nalog =  Math.round(korob_korob_nalog_bf * 0.15)
				const korob_nalog_sf = (korob_nalog) + (sum1_9)

				const korob_zp_magager_sf = Math.round(korobka_itogo_rab_s_f * 0.01)
				const korob_zp_tehno_sf = Math.round(korobka_itogo_rab_s_f * 0.01)
				const korob_zp_magager_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)
				const korob_zp_tehno_bf = Math.round(korobka_itogo_rab_bez_f * 0.01)

				const prib_bez_fund = Math.round(korobka_itogo_rab_bez_f - korobka_itogo_mat_bn - korob_raboty_rab - rashReal1 - korob_nalog  )
				const prib_s_fund = Math.round(korobka_itogo_rab_s_f - korobka_itogo_mat_bn - korob_raboty_rab - rashReal1 - korob_nalog_sf - sum1_1 - sum1_2 - sum1_3  )


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
				
				// ИНЖ КОММ
				const sum29_1 = sumAll(positions.filter((pos: any) => pos.code == 29)) // 29 Инженерные коммуникации

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
				const itogo_rab_v_tk = sum27_1 + sum22_1 + sum20_1 + sum18_1 + sum16_1 + sum14_1 + sum12_1 + sum10_1 + sum8_1 + sum6_1
				// const itogo_rab_v_tk =  sum22_1 + sum20_1 + sum18_1 + sum16_1 + sum14_1 + sum12_1 + sum10_1 + sum8_1 + sum6_1

				// 29_1 инженерные коммуникации 28_1 материалы антресоль
				const itogo_mat_v_tk_bn = sum29_1 + sum28_1 + sum23_1 + sum21_1 + sum19_1 + sum17_1 + sum15_1 + sum13_1 + sum11_1 + sum9_1 + sum7_1
				// const itogo_mat_v_tk_bn = sum23_1 + sum21_1 + sum19_1 + sum17_1 + sum15_1 + sum13_1 + sum11_1 + sum9_1 + sum7_1
				const itogo_mat_sn = Math.round(itogo_mat_v_tk_bn * koef2)
				const mat_bez_chekov = nakladnie_itogo
				const raboty_rabotnikov =  Math.round(itogo_rab_v_tk * 0.6)
				const prib_s_mat = itogo_mat_sn - itogo_mat_v_tk_bn
				const prib_s_rab = itogo_rab_v_tk - raboty_rabotnikov

				const itogo_rab_i_mat_po_dog_vtk = itogo_rab_v_tk + itogo_mat_sn + mat_bez_chekov
				const itogo_rab_po_dog_vtk_pod_krish_bez_fund =  itogo_rab_i_mat_po_dog_vtk + korobka_itogo_rab_bez_f +  mat_bez_chekov
				const itogo_rab_po_dog_vtk_pod_krish_s_fund = itogo_rab_po_dog_vtk_pod_krish_bez_fund + sum1_7
				
				// const itogo_minus_sebest = itogo_rab_po_dog_vtk_pod_krish_s_fund - 
					const zp_v_tk_manager = Math.round(itogo_rab_i_mat_po_dog_vtk * 0.01)
					const zp_v_tk_tehnodzor = Math.round(itogo_rab_i_mat_po_dog_vtk * 0.01)
					const zp_v_tk_manager_bf = Math.round(itogo_rab_po_dog_vtk_pod_krish_bez_fund * 0.01)
					const zp_v_tk_tehnodzor_bf = Math.round(itogo_rab_po_dog_vtk_pod_krish_bez_fund * 0.01)
					const zp_v_tk_manager_sf = Math.round(itogo_rab_po_dog_vtk_pod_krish_s_fund * 0.01)
					const zp_v_tk_tehnodzor_sf = Math.round(itogo_rab_po_dog_vtk_pod_krish_s_fund * 0.01)

				// rashod_real
				const summa_nalogoobl = itogo_rab_i_mat_po_dog_vtk - itogo_mat_v_tk_bn - rashReal2
				const nalog = Math.round(summa_nalogoobl * 0.075)
				const pribil_v_tk = itogo_rab_i_mat_po_dog_vtk - nalog - rashReal2 - itogo_mat_v_tk_bn - raboty_rabotnikov - mat_bez_chekov - zp_v_tk_manager - zp_v_tk_tehnodzor
				const pribil_v_tk_pk_bf = Math.round(pribil_v_tk + prib_bez_fund - zp_v_tk_manager - zp_v_tk_tehnodzor)
				const pribil_v_tk_pk_sf = Math.round(pribil_v_tk + prib_s_fund - zp_v_tk_manager - zp_v_tk_tehnodzor)
				const sebest_v_tk_sf = Math.round(sum1_5 + korobka_itogo_rab + korob_raboty_rab + rashReal1 + korob_nalog_sf + itogo_mat_v_tk_bn + mat_bez_chekov + raboty_rabotnikov + rashReal2 + nalog + zp_v_tk_manager_sf + zp_v_tk_tehnodzor_sf)
				const itogo_rabot_minus_sebest = Math.round(itogo_rab_po_dog_vtk_pod_krish_s_fund - sebest_v_tk_sf)

				setSums({ sum1_1, sum1_2, sum1_3, sum1_4, sum1_5, sum1_6, sum1_7, sum1_8, sum1_9, sum1_10, sum2_1, sum3_1, sum4_1, sum5_1, sum5_2, 
					korobka_itogo_rab, korobka_itogo_mat_bn, korob_itogo_mat_sn, korob_raboty_rab, korob_prib_s_mat, korob_prib_s_rab, korobka_itogo_rab_bez_f, korobka_itogo_rab_s_f,
					korob_korob_nalog_bf, korob_nalog, korob_nalog_sf, korob_zp_magager_sf, korob_zp_tehno_sf, korob_zp_magager_bf, korob_zp_tehno_bf, prib_bez_fund, prib_s_fund,
					fasad_itogo, okna_itogo, perekr_itogo, mkperekr_itogo, nakladnie_itogo,
					sum6_1, sum7_1, sum8_1, sum9_1, sum10_1, sum11_1, sum12_1, sum13_1, sum14_1, sum15_1, sum16_1, sum17_1, sum18_1, sum19_1, sum20_1, sum21_1, sum22_1, sum23_1, sum24_1, sum25_1, sum26_1, sum27_1, sum28_1,
					itogo_rab_v_tk, itogo_mat_v_tk_bn, itogo_mat_sn, mat_bez_chekov, raboty_rabotnikov, prib_s_mat, prib_s_rab, itogo_rab_i_mat_po_dog_vtk, itogo_rab_po_dog_vtk_pod_krish_bez_fund, itogo_rab_po_dog_vtk_pod_krish_s_fund,
					pribil_v_tk, nalog,  zp_v_tk_manager, zp_v_tk_tehnodzor, summa_nalogoobl, pribil_v_tk_pk_bf, pribil_v_tk_pk_sf, sebest_v_tk_sf, itogo_rabot_minus_sebest, zp_v_tk_manager_bf, zp_v_tk_tehnodzor_bf,
					zp_v_tk_manager_sf, zp_v_tk_tehnodzor_sf, rashReal1, rashReal2, koef1, koef2, sum29_1
					
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
	
	const getTillComa = (str: string) => {
		return str.split(',').slice(0, 1);
	};
	const getTillParentheses = (str: string) => {
		return str.split('(').slice(0, 1);
	};
	const getInParentheses = (str: string) => {
		const match = str.match(/\(([^)]+)\)/);
		return match ? match[1] : '';
	}
	const removeFirstTwoWords = (str: string) => {
		return str.split(' ').slice(2).join(' ');
	}
	
	return (
		<>

			<div className='bg-white flex flex-col max-w-screen-lg mx-auto w-full mb-6 py-8'>

				<div id='content' className='text-md leading-5 flex flex-col py-4 w-full px-4'>

				{/*  Стеновой комплект */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border text-lg font-semibold'>
					<div className='mx-auto'>1. Этап — Стеновой комплект</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 2 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{/* <Position key={generateUniqueId()} position={{ ...emptyPos, id: generateUniqueId() , code: 2 }} handlePosChange={handlePosChange} /> */}
				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 1 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum2_1)}</div>
					</div>
				</>	
				}

				{/* Кровля */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>2. Этап - Кровля с утеплением</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 4 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 2 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum4_1)}</div>
					</div>
				</>	
				}

				{/*  Полы 1 этаж  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>3. Этап -  Полы 1 этаж </div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 16 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}


				{/* Межэтажное перекрытия  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Межэтажные перекрытия</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 18 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 3 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum18_1 + sums.sum16_1)}</div>
					</div>
				</>	
				}

				{/* Двери Окна  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>4. Этап Двери и окна</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 14 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 4 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum14_1)}</div>
					</div>
				</>	
				}

				{/* Свесы кровли работы  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>5. Этап - Свесы кровли</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 6 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 5 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum6_1)}</div>
					</div>
				</>	
				}

				{/* Межкомнатные перегородки  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>6. Этап - Межкомнатные перегородки</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 22 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}


				{/* Терраса  */}
				{positions &&
				<div className='flex flex-row w-full px-5 py-3 border border-t-0 text-lg font-semibold'>
					<div className='mx-auto'>Терраса</div>
				</div>}

				{positions && positions.filter((position: any) => position.code == 10 && position.value > 0).map((position: any, index: any) => (
				<div key={position.id} className='flex w-full flex-row py-2 px-2 border border-t-0 text-sm gap-6 '>
					<div className='flex w-8/12 my-auto'>{position.name}</div>
					<div className='flex w-1/12'>{position.measure}</div>
					<div className='flex w-1/12'>{position.value}</div>
					<div className='flex w-1/12'>{position.price}</div>
					<div className='flex w-1/12'>{Intl.NumberFormat('ru-RU').format(position.value * position.price)}</div>
				</div>
				))}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по 6 этапу:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum10_1 + sums.sum22_1)}</div>
					</div>
				</>	
				}
				{/* Итого  */}

				{positions && sums && 
				<>
					<div className='flex flex-row w-full px-5 py-4 border border-t-0 text-sm gap-6  bg-lime-100' >
						<div className='w-9/12 my-auto text-right font-bold'>Итого работ по всем разделам:</div>
						<div className='w-3/12 my-auto' id=''>{Intl.NumberFormat('ru-RU').format(sums.sum2_1 + sums.sum4_1 + sums.sum14_1 + sums.sum6_1 + (sums.sum18_1 + sums.sum16_1) + (sums.sum10_1 + sums.sum22_1))}</div>
					</div>
				</>	
				}

				</div>

			</div>

		</>
	)

}

export default OrderSp