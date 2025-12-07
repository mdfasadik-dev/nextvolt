import React from "react";
import { WobbleCard } from "../kit/WobbleCard";

export function BentoGrid() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full">
            <WobbleCard
                containerClassName="col-span-1 lg:col-span-2 h-full bg-blue-800 min-h-[500px] lg:min-h-[300px]"
                className=""
            >
                <div className="max-w-xs">
                    <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                        Lithium Batteries – Power Without Limits
                    </h2>
                    <p className="mt-4 text-left  text-base/6 text-neutral-200">
                        Energo lithium batteries offer long life, fast charging, and high efficiency.
                        They power inverters and solar systems with reliability, safety, and sustainability.
                    </p>
                </div>
                <img
                    src="/batteries.png"
                    width={500}
                    height={500}
                    alt="linear demo image"
                    className="absolute -right-4 lg:-right-[20%] filter -bottom-10 object-contain rounded-2xl"
                />
            </WobbleCard>
            <WobbleCard containerClassName="col-span-1 min-h-[300px]">
                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    Solar Energy – Power from the Sun
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                    Clean, renewable, and cost-efficient,
                    Nextvolt solar energy solutions bring sustainable power to your home and business.
                </p>
            </WobbleCard>
            <WobbleCard containerClassName="col-span-1 lg:col-span-3 bg-blue-900 min-h-[500px] lg:min-h-[600px] xl:min-h-[300px]">
                <div className="max-w-sm">
                    <h2 className="max-w-sm md:max-w-lg  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                        Solar Inverters – Smart Energy Conversion
                    </h2>
                    <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                        Nextvolt solar inverters deliver seamless power conversion from sun to supply.
                        They ensure maximum efficiency for homes and businesses.
                    </p>
                </div>
                <img
                    src="/solar_inverter.png"
                    width={500}
                    height={500}
                    alt="linear demo image"
                    className="absolute -right-10 md:-right-[40%] lg:-right-[5%] -bottom-5 object-contain rounded-2xl"
                />
            </WobbleCard>
        </div>
    );
}