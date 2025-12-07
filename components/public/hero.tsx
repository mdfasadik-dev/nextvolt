import Link from 'next/link';
import { AuroraText } from '../kit/AuroraText';
import { InteractiveHoverButton } from '../kit/InteractiveHoverButton';
import { Button } from '../ui/button';
import { Particles } from '../kit/Particles';

export function Hero() {
    return (
        <section className="w-full relative py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-background">

            <Particles
                className="absolute inset-0 z-0"
                quantity={100}
                ease={50}
                refresh
            />

            <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-tight text-center">
                Powering Tomorrow <br />
                with <AuroraText>NextVolt.</AuroraText>
            </h1>



            <div className='w-full flex justify-center items-center gap-2 mt-6'>
                <InteractiveHoverButton>
                    <Link href="/#categories">
                        Shop Now
                    </Link>
                </InteractiveHoverButton>
                {/* <Button variant="ghost" size="lg">
                    Contact Us
                </Button> */}
            </div>
        </section>
    );
}
