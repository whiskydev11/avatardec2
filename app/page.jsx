"use client";

import decorationsData from "../decorations.json";
import avatarsData from "../avatars.json";
import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { addDecoration, cropToSquare } from "@/ffmpeg/processImage";
import { Modal } from "./components/modal";
import Link from "next/link";
import Twemoji from "./components/twemoji";

import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";

import { Image } from "./components/image";
import { FileUpload } from "./components/fileupload";
import { printMsg, printErr } from "./print";
import { getMimeTypeFromArrayBuffer } from "@/ffmpeg/utils";
import { useRouter } from "next/navigation";
const baseImgUrl = process.env.NEXT_PUBLIC_BASE_IMAGE_URL || "";

export default function Home() {
	const isServer = typeof window === "undefined";

	const [loaded, setLoaded] = useState(false);
	const ffmpegRef = useRef(isServer ? null : new FFmpeg());

	const load = async () => {
		if (isServer) return;
		const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/";
		const ffmpeg = ffmpegRef.current;
		// toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
		await ffmpeg.load({
			coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
			wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, "application/wasm"),
		});
		ffmpeg.on("log", (e) =>
			printMsg(
				["ffmpeg", e.message],
				[
					{
						color: "white",
						background: "#5765f2",
						padding: "2px 8px",
						borderRadius: "10px",
					},
				]
			)
		);
		setLoaded(true);
	};

	const previewAvatar = async (url) => {
		if (isServer) return;
		setAvUrl("loading");
		const res = await cropToSquare(ffmpegRef.current, url).catch((reason) => printErr(reason));
		if (!res) return setAvUrl(null);
		setAvUrl(res);
	};

	const createAvatar = async (url, deco) => {
		if (isServer) return;
		addDecoration(ffmpegRef.current, url, deco === "" ? "" : `${baseImgUrl}${deco}`)
			.then((res) => {
				if (!res) return setFinishedAv(null), setGenerationFailed(true);
				setFinishedAv(res);
				setIsGeneratingAv(false);
			})
			.catch((reason) => {
				setGenerationFailed(true);
				setIsGeneratingAv(false);
				printErr(reason);
			});
	};

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [decoUrl, setDecoUrl] = useState("");
	const [avUrl, setAvUrl] = useState("");

	const [finishedAv, setFinishedAv] = useState("");
	const [isGeneratingAv, setIsGeneratingAv] = useState(false);
	const [generationFailed, setGenerationFailed] = useState(false);
	const [downloadModalVisible, setDownloadModalVisible] = useState(false);
	const [shared, setShared] = useState(false);

	let t = false;
	useEffect(() => {
		if (t) return;
		t = true;
		load();
	}, []);

	const router = useRouter();

	return (
		<>
			{loaded ? (
				<>
					<main className="flex flex-col items-center w-screen h-screen text-white overflow-auto discord-scrollbar">
						<div
							className="flex flex-col justify-center items-center bg-primary mt-8 px-4 py-8 sm:p-8 md:p-12 lg:p-16 rounded-3xl w-[calc(100%-6rem)] text-center"
							style={{
								backgroundImage: new Date().getMonth() == 11 ? `url(${baseImgUrl}/wallpaper/winter.jpg)` : "",
								backgroundPosition: "center bottom",
								backgroundSize: "cover",
							}}
						>
							<h1 className="font-bold text-3xl md:text-5xl ginto">Discord</h1>
							<h1 className="mb-4 text-2xl md:text-4xl ginto">SAHTE AVATAR DEKORASYONLARI</h1>
							<h2 className="text-sm sm:text-base">
							Avatar dekorasyonları ile profil resimleri oluşturun ve bunları Discord'da para harcamadan ücretsiz olarak kullanın.
							</h2>
						</div>
						<div className="flex md:flex-row flex-col items-center md:items-start gap-8 px-8 py-12 w-full max-w-[900px]">
							{/* SETTINGS */}
							<div id="settings" className="block select-none grow">
								{/* UPLOAD AVATAR */}
								<p className="my-2 font-semibold text-gray-300 text-sm [letter-spacing:.05em] scale-y-90">AVATAR</p>
								<div className="flex sm:flex-row flex-col sm:items-center gap-3">
									<button
										type="button"
										className="bg-primary hover:bg-primaryAlt px-4 py-2 rounded transition"
										onClick={() => {
											document.getElementById("upload-avatar").click();
										}}
									>
										<input
											type="file"
											id="upload-avatar"
											className="hidden"
											accept="image/png, image/jpeg, image/gif"
											onChange={(e) => {
												const [file] = e.target.files;
												if (file) {
													const reader = new FileReader();
													reader.readAsDataURL(file);
													reader.onload = () => {
														previewAvatar(reader.result);
													};
												}
											}}
										/>
										Görsel yükle
									</button>
									<p className="text-center sm:text-left">veya</p>
									<input
										type="text"
										className="bg-surface1 px-2.5 py-2 rounded transition grow outline-none"
										placeholder="Görsel bağlantısı gir..."
										onChange={async (e) => {
											const res = await fetch(e.target.value);
											if (res.status < 200 || res.status >= 400) return setAvUrl(null);
											const blob = await res.blob();
											if (!["image/png", "image/jpeg", "image/gif"].includes(blob.type)) return setAvUrl(null);
											const reader = new FileReader();
											reader.readAsDataURL(blob);
											reader.onload = () => {
												previewAvatar(reader.result);
											};
										}}
									/>
								</div>
								<p className="mt-4 mb-2">Ayrıca aşağıdaki hazır avatarlardan birini de seçebilirsiniz.</p>
								{/* SELECT AVATAR */}
								<div className="flex flex-col gap-8 py-1 max-h-[280px] overflow-auto discord-scrollbar">
									<div className="gap-3 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 min-[600px]:grid-cols-6 min-[720px]:grid-cols-7 xs:grid-cols-4">
										{avatarsData.map((avatar, index) => {
											return (
												<div key={index} className="flex flex-col items-center text-center">
													<button
														key={index}
														data-tooltip-id={avatar.name.toLowerCase().replaceAll(" ", "-")}
														data-tooltip-content={avatar.name}
														className="border-2 border-surface1 bg-surface1 p-2 rounded-[5px] w-full aspect-square avatar-preset outline-none"
														onClick={(e) => {
															setAvUrl(baseImgUrl + avatar.file);
															document.querySelectorAll("button.avatar-preset.border-2.border-primary").forEach((el) => {
																el.classList.remove("border-primary");
																el.classList.add("border-surface1");
															});
															e.target.classList.add("border-primary");
															e.target.classList.remove("border-surface1");
														}}
													>
														<Image src={avatar.file} className="rounded-full pointer-events-none" />
													</button>
													<Tooltip
														id={avatar.name.toLowerCase().replaceAll(" ", "-")}
														opacity={1}
														style={{
															background: "#111214",
															borderRadius: "8px",
															padding: "6px 12px 4px 12px",
															boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.2)",
														}}
													/>
												</div>
											);
										})}
									</div>
								</div>
								<hr />

								{/* SELECT DECORATION */}
								<p className="my-2 font-semibold text-gray-300 text-sm [letter-spacing:.05em] scale-y-90">AVATAR DEKORASYONLARI</p>
								<div className="flex flex-col gap-8 py-1 max-h-[532px] overflow-auto discord-scrollbar">
									{decorationsData.map((category, index) => {
										return (
											<div key={index}>
												<div className="relative justify-center items-center grid grid-cols-1 grid-rows-1 bg-black mb-4 rounded-2xl h-28 overflow-hidden">
													{typeof category.banner.image !== "string" ? (
														<>
															<div
																className="top-0 right-0 bottom-0 left-0 absolute"
																style={{
																	background: category.banner.background || "#000",
																}}
															/>
															{category.banner.image.map((e, i) => (
																<Image
																	key={i}
																	className={`object-cover bottom-0 absolute`}
																	src={e.url}
																	alt={""}
																	draggable={false}
																	loading="eager"
																	height={0}
																	width={0}
																	style={{
																		height: e.height || "auto",
																		width: e.width || (e.height ? "auto" : "100%"),
																		left: e.align == "left" || e.align == "center" ? 0 : "",
																		right: e.align == "right" || e.align == "center" ? 0 : "",
																		objectPosition: e.align,
																	}}
																/>
															))}
														</>
													) : (
														<Image
															className="[grid-column:1/1] [grid-row:1/1] object-cover"
															src={category.banner.image}
															alt={""}
															draggable={false}
															loading="eager"
															height={0}
															width={0}
															style={{
																height: "100%",
																width: "100%",
																objectFit: "cover",
																objectPosition: category.banner.bgPos || "",
															}}
														/>
													)}
													<div className="relative flex flex-col justify-center items-center [grid-column:1/1] [grid-row:1/1] p-4 h-full">
														{category.banner.text ? (
															category.banner.text === "" ? (
																<div
																	style={{
																		height: `${category.banner.height || 48}px`,
																		width: "100%",
																	}}
																/>
															) : (
																<Image
																	src={category.banner.text}
																	alt={category.name}
																	draggable={false}
																	loading="eager"
																	height={0}
																	width={0}
																	style={{
																		height: `${category.banner.height || 48}px`,
																		width: "auto",
																	}}
																/>
															)
														) : (
															<>
																{!category.hideTitle && (
																	<p
																		className="px-4 text-3xl text-center ginto"
																		style={{
																			color: category.darkText || false ? "#000" : "#fff",
																		}}
																	>
																		{category.name}
																	</p>
																)}
															</>
														)}
														<p
															className="w-[232px] xs:w-full font-medium text-center text-sm"
															style={{
																color: category.darkText || false ? "#000" : "#fff",
																marginTop: category.descriptionTopMargin || "",
															}}
														>
															{category.description}
														</p>
														{category.badge && (
															<p className="top-2 right-2 absolute bg-white m-0 px-2 py-0 rounded-full font-semibold text-black text-xs [letter-spacing:0]">
																{category.badge}
															</p>
														)}
													</div>
												</div>

												<div className="gap-3 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 min-[600px]:grid-cols-6 min-[720px]:grid-cols-7 xs:grid-cols-4">
													{category.items.map((decor, index) => {
														return (
															<button
																key={index}
																className="border-2 border-surface1 bg-surface1 p-1 rounded-[5px] w-full aspect-square decor"
																onClick={(e) => {
																	setName(decor.name);
																	setDescription(decor.description);
																	setDecoUrl(decor.file);
																	document.querySelectorAll("button.decor.border-2.border-primary").forEach((el) => {
																		el.classList.remove("border-primary");
																		el.classList.add("border-surface1");
																	});
																	e.target.classList.add("border-primary");
																	e.target.classList.remove("border-surface1");
																}}
															>
																<Image src={decor.file} className="pointer-events-none" />
															</button>
														);
													})}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							<div className="flex flex-col items-center gap-8">
								{/* PROFILE PREVIEW */}
								<div
									id="profile-preview"
									className="relative bg-surface2 shadow-lg rounded-xl w-[256px] xs:w-[340px] overflow-hidden select-none"
								>
									<div className="bg-[#5461f2] h-[60px]"></div>
									<div className="top-4 left-5 absolute border-[6px] border-surface2 bg-surface2 rounded-full w-[92px] h-[92px] select-none">
										<div className="relative rounded-full w-[80px] h-[80px] overflow-hidden">
											{avUrl == "loading" ? (
												<div className="top-[24px] left-[24px] absolute">
													<span className="loading-container">
														<span className="loading-cube"></span>
														<span className="loading-cube"></span>
													</span>
												</div>
											) : (
												<>
													<Image
														id="avatar"
														src={avUrl || `${baseImgUrl}/avatars/blue.png`}
														className={
															"absolute top-[calc(80px*0.09)] left-[calc(80px*0.09)] w-[calc(80px*0.82)] h-[calc(80px*0.82)] rounded-full"
														}
														draggable={false}
													/>
													<Image id="decoration" src={decoUrl} className="top-0 left-0 absolute" draggable={false} />
												</>
											)}
										</div>
										<div className="right-[-4px] bottom-[-4px] absolute border-[5px] border-surface2 bg-[#229f56] rounded-full w-7 h-7"></div>
									</div>
									<div className="bg-surface0 m-4 mt-[calc(15rem/4)] p-4 rounded-lg w-[calc(100%-32px)]">
										<p className="font-semibold text-xl [letter-spacing:.02em]">{name || "Whisky Lorean"}</p>
										<p className="text-sm">{description || "whiskeyxd"}</p>
										<hr />
										<p className="font-semibold text-xs [letter-spacing:.02em] mb-1 scale-y-95">HAKKIMDA</p>
										<p className="text-sm">
										Merhaba, bu örnek bir profildir. Böylece Discord'da profil resminin nasıl görüneceğini görebilirsin.
										</p>
										<p className="font-semibold text-xs [letter-spacing:.02em] mt-3 mb-1 scale-y-95">ŞU TARİHTEN BERİ ÜYE</p>
										<p className="text-sm">May 13, 2015</p>
										<button
											className="flex justify-center items-center gap-2 bg-secondary hover:bg-secondaryAlt mt-3 py-1.5 rounded-[3px] w-full transition"
											onClick={() => {
												setFinishedAv("");
												setIsGeneratingAv(true);
												setGenerationFailed(false);
												setDownloadModalVisible(true);
												createAvatar(avUrl || `${baseImgUrl}/avatars/blue.png`, decoUrl);
											}}
										>
											<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512">
												<path
													fill="#ffffff"
													d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V173.3c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32H64zm0 96c0-17.7 14.3-32 32-32H288c17.7 0 32 14.3 32 32v64c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V128zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
												/>
											</svg>
											Görseli Kaydet
										</button>
									</div>
								</div>
								{/* Message preview */}
								<div className="border-surface1 bg-surface3 py-4 border rounded-lg w-full cursor-default select-none">
									{[
										{
											styled: false,
											groupStart: true,
											text: "Bana bak ben güzel bir kelebeğim",
										},
										{
											styled: false,
											groupStart: false,
											text: (
												<>
													Ay ışığında pır pır ediyorum <Twemoji emoji={"🌝"} />
												</>
											),
										},
										{
											styled: false,
											groupStart: false,
											text: "O günü bekliyorum",
										},
										{
											styled: false,
											groupStart: false,
											text: "Profil resmi dekorasyonu alıyorum",
										},
										{
											styled: true,
											groupStart: true,
											text: (
												<>
													{decoUrl ? (
														<>
															Vay! İşte burada! <Twemoji emoji={"🎉"} />
														</>
													) : (
														<>
															Hmm... Bir şey göremiyorum <Twemoji emoji={"🤔"} />
														</>
													)}
												</>
											),
										},
									].map((m, i) => {
										return (
											<div
												className="flex items-center gap-4 hover:bg-[#02020210] px-4 py-0.5"
												style={{
													marginTop: m.groupStart && i != 0 ? "17px" : "0",
												}}
												key={i}
											>
												{m.groupStart && (
													<>
														{avUrl == "loading" ? (
															<div className="relative w-10 h-10 scale-75">
																<span className="loading-container">
																	<span className="loading-cube"></span>
																	<span className="loading-cube"></span>
																</span>
															</div>
														) : (
															<>
																{m.styled ? (
																	<div className="relative rounded-full w-10 h-10 overflow-hidden">
																		<Image
																			src={avUrl || `${baseImgUrl}/avatars/blue.png`}
																			draggable={false}
																			className="top-[calc(40px*0.09)] left-[calc(40px*0.09)] absolute rounded-full w-[calc(40px*0.82)] h-[calc(40px*0.82)]"
																		/>
																		{decoUrl && <Image src={decoUrl} draggable={false} className="top-0 left-0 absolute" />}
																	</div>
																) : (
																	<Image
																		src={avUrl || `${baseImgUrl}/avatars/blue.png`}
																		draggable={false}
																		className="rounded-full w-10 h-10"
																	/>
																)}
															</>
														)}
													</>
												)}
												<div className="flex flex-col">
													{m.groupStart && (
														<p className="h-fit font-medium text-base">
															<span className="mr-1">{name || "Whisky Lorean"}</span>
															<span className="ml-1 h-4 text-secondaryLight text-xs">
																Bugün saat{" "}
																{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
															}
															</span>
														</p>
													)}

													<p
														style={{
															marginLeft: m.groupStart ? "0" : "56px",
															lineHeight: "22px",
														}}
													>
														{m.text}
													</p>
												</div>
											</div>
										);
									})}
								</div>

								{/* pls support */}
								<div className="flex flex-col justify-start items-stretch w-full text-center">
									<p>
										Bu projeye destek ol <Twemoji emoji="🙏" />
									</p>
									<button
										className="flex justify-center items-center gap-1 bg-secondary hover:bg-secondaryAlt mt-3 py-1.5 rounded-[3px] transition"
										onClick={() => {
											navigator.clipboard.writeText(window.location.href);
											setShared(true);
											setTimeout(() => {
												setShared(false);
											}, 1500);
										}}
										data-tooltip-id="share-tooltip"
										data-tooltip-content="Bağlantı Kopyalandı!"
									>
										<svg height="1.1em" fill="none" viewBox="2 2 21 21" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M17 3.002a2.998 2.998 0 1 1-2.148 5.09l-5.457 3.12a3.002 3.002 0 0 1 0 1.577l5.458 3.119a2.998 2.998 0 1 1-.746 1.304l-5.457-3.12a2.998 2.998 0 1 1 0-4.184l5.457-3.12A2.998 2.998 0 0 1 17 3.002Z"
												fill="#ffffff"
											/>
										</svg>
										Bu siteyi arkadaşlarınla paylaş
									</button>
									<Tooltip
										id="share-tooltip"
										opacity={1}
										style={{
											display: shared ? "block" : "none",
											background: "#229f56",
											color: "white",
											borderRadius: "8px",
											padding: "6px 12px 4px 12px",
											boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
										}}
										closeEvents={[]}
										place="bottom"
									/>
									<button
										className="flex justify-center items-center gap-1 bg-secondary hover:bg-secondaryAlt mt-3 py-1.5 rounded-[3px] transition"
										onClick={() => {
											navigator.clipboard.writeText("https://discord-decorations.vercel.app/");
											setShared(true);
											setTimeout(() => {
												setShared(false);
											}, 1500);
										}}
										data-tooltip-id="share-tooltip"
										data-tooltip-content="Bağlantı Kopyalandı!"
									>
										<svg height="1.1em" fill="none" viewBox="2 2 21 21" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M17 3.002a2.998 2.998 0 1 1-2.148 5.09l-5.457 3.12a3.002 3.002 0 0 1 0 1.577l5.458 3.119a2.998 2.998 0 1 1-.746 1.304l-5.457-3.12a2.998 2.998 0 1 1 0-4.184l5.457-3.12A2.998 2.998 0 0 1 17 3.002Z"
												fill="#ffffff"
											/>
										</svg>
										Orijinal siteyi arkadaşlarınla paylaş
									</button>
									<Tooltip
										id="share-tooltip"
										opacity={1}
										style={{
											display: shared ? "block" : "none",
											background: "#229f56",
											color: "white",
											borderRadius: "8px",
											padding: "6px 12px 4px 12px",
											boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
										}}
										closeEvents={[]}
										place="bottom"
									/>
									<button
										className="flex justify-center items-center gap-1 bg-secondary hover:bg-secondaryAlt mt-3 py-1.5 rounded-[3px] transition"
										onClick={() => {
											window.open("https://github.com/ItsPi3141/discord-fake-avatar-decorations");
										}}
									>
										<svg height="1em" fill="none" viewBox="2 2 22 21" xmlns="http://www.w3.org/2000/svg">
											<path
												d="M10.788 3.103c.495-1.004 1.926-1.004 2.421 0l2.358 4.777 5.273.766c1.107.161 1.549 1.522.748 2.303l-3.816 3.72.901 5.25c.19 1.103-.968 1.944-1.959 1.424l-4.716-2.48-4.715 2.48c-.99.52-2.148-.32-1.96-1.424l.901-5.25-3.815-3.72c-.801-.78-.359-2.142.748-2.303L8.43 7.88l2.358-4.777Z"
												fill="#ffffff"
											/>
										</svg>
										Projeyi GitHub'da yıldızla
									</button>
								</div>
							</div>
						</div>
						<p className="mb-4 text-center text-gray-400 text-sm">
							NOT: Bu Websitesi {" "}
							<Link href={"https://github.com/ItsPi3141"} className="hover:text-gray-200 underline" target="_blank">
								ItsPi3141
							</Link>{" "} tarafından geliştirilmiştir. Yalnızca türkçeleştirme yapılmıştır.
							<br />
							Bu proje açık kaynaklıdır! {" "}
							<Link
								href={"https://github.com/ItsPi3141/discord-fake-avatar-decorations"}
								className="hover:text-gray-200 underline"
								target="_blank"
							>Kaynak kod
							</Link>
							larını görüntüle.
							<br />
							Bu sitenin hiçbir şekilde Discord Inc. ile bağlantısı BULUNMAMAKTADIR. Tüm görseller ve içerikler Discord Inc.'e aittir.
							<br />
							Yukarıda bulunan hazır karakter avatarları Bred ve Jace tarafından oluşturuldu. {" "}
							<Link
								href={"https://www.figma.com/community/file/1316822758717784787/ultimate-discord-library"}
								className="hover:text-gray-200 underline"
								target="_blank"
							>
								Figma
							</Link>{" "}
							üzerinde görüntüle.
						</p>
					</main>
					<Modal
						title={"Avatar dekorasyonunu indir"}
						subtitle={
							isGeneratingAv
								? "Görsel oluşturulurken lütfen bekleyin"
								: "Aşağıdaki görseli indirebilirsiniz. Etkin bir Nitro aboneliğiniz yoksa görüntüden sabit bir kare (.png, .jpg, vb..) çıkarmanız gerekebilir. (Görsel .gif olduğu için Nitro gerektiriyor.)"
						}
						visible={downloadModalVisible}
						onClose={() => {
							setDownloadModalVisible(false);
						}}
					>
						{isGeneratingAv ? (
							<div className="flex flex-col justify-center items-center gap-4 grow">
								<span className="loading-container">
									<span className="loading-cube"></span>
									<span className="loading-cube"></span>
								</span>
								<p>Görsel oluşturuluyor...</p>
							</div>
						) : (
							<>
								{generationFailed ? (
									<div className="flex flex-col justify-center items-center gap-4 grow">
										<p className="text-center text-red-400">
											Görsel oluşturulamadı,
											<br />
											Lütfen tekrar dene.
										</p>
									</div>
								) : (
									<div className="flex flex-col justify-center items-center gap-4 grow">
										<img src={finishedAv} draggable={false} width={128} height={128} />
										<div className="flex flex-col w-full">
											<div className="flex flex-col items-center gap-2 mt-3 w-full">
												<button
													className="flex justify-center items-center gap-1 bg-secondary hover:bg-secondaryAlt py-1.5 rounded-[3px] w-72 transition"
													onClick={() => {
														const a = document.createElement("a");
														a.href = finishedAv;
														a.download = `discord_sahte_dekorasyon_${Date.now()}.gif`;
														a.click();
													}}
												>
													<svg height="1.1em" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
														<path
															d="M5.25 20.5h13.498a.75.75 0 0 1 .101 1.493l-.101.007H5.25a.75.75 0 0 1-.102-1.494l.102-.006h13.498H5.25Zm6.633-18.498L12 1.995a1 1 0 0 1 .993.883l.007.117v12.59l3.294-3.293a1 1 0 0 1 1.32-.083l.094.084a1 1 0 0 1 .083 1.32l-.083.094-4.997 4.996a1 1 0 0 1-1.32.084l-.094-.083-5.004-4.997a1 1 0 0 1 1.32-1.498l.094.083L11 15.58V2.995a1 1 0 0 1 .883-.993L12 1.995l-.117.007Z"
															fill="#ffffff"
														/>
													</svg>
													İndir
												</button>
												<button
													className="flex justify-center items-center gap-1 bg-secondary hover:bg-secondaryAlt py-1.5 rounded-[3px] w-72 transition"
													onClick={() => {
														if (!isServer) {
															sessionStorage.setItem("image", finishedAv);
															router.push("/gif-extractor");
														}
													}}
												>
													<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 28 28">
														<path
															fill="#ffffff"
															d="M4.66663 0.666626C2.45749 0.666626 0.666626 2.45748 0.666626 4.66662V23.3333C0.666626 25.5424 2.45748 27.3333 4.66662 27.3333H23.3333C25.5424 27.3333 27.3333 25.5424 27.3333 23.3333V4.66663C27.3333 2.45749 25.5424 0.666626 23.3333 0.666626H4.66663ZM8.66663 5.99996C10.1376 5.99996 11.3333 7.19356 11.3333 8.66663C11.3333 10.1408 10.1376 11.3333 8.66663 11.3333C7.19249 11.3333 5.99996 10.1408 5.99996 8.66663C5.99996 7.19356 7.19249 5.99996 8.66663 5.99996ZM5.99996 22L9.99996 16.6666L12.6666 19.3333L18 12.6666L22 22H5.99996Z"
															fillRule="evenodd"
															clipRule="evenodd"
														/>
													</svg>
													Hareketsiz olarak indir
												</button>
											</div>
										</div>
									</div>
								)}
							</>
						)}
					</Modal>
					<FileUpload
						onUpload={async (e) => {
							const file = e.dataTransfer.files.item(0);
							if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) {
								printErr(`Expected image/png, image/jpeg, or image/gif. Got ${file.type}`);
								throw printErr("Invalid file type");
							}
							const ab = await file.arrayBuffer();
							if (getMimeTypeFromArrayBuffer(ab) == null) {
								throw printErr("Invalid image file");
							}
							const reader = new FileReader();
							reader.readAsDataURL(new Blob([ab]));
							reader.onload = () => {
								previewAvatar(reader.result);
							};
						}}
					/>
				</>
			) : (
				<main className="flex flex-col justify-center items-center p-8 w-full h-screen text-white">
					<p className="top-8 absolute mx-8 max-w-xl font-bold text-4xl text-center ginto">
						Discord
						<br />
						SAHTE AVATAR DEKORASYONLARI
					</p>
					<span className="mb-8 loading-container">
						<span className="loading-cube"></span>
						<span className="loading-cube"></span>
					</span>
					<p>Yükleniyor...</p>
				</main>
			)}
		</>
	);
}
