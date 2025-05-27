import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] noise">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-4">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[#0a0a0a]"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#ff3e00] via-transparent to-transparent opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-[#00e1ff] via-transparent to-transparent opacity-30"></div>
        </div>
        
        <div className="container mx-auto relative z-10 max-w-6xl">
          <div className="flex flex-col items-center text-center mb-12">
            <h1 className="text-7xl md:text-9xl font-bold mb-8">
              <span className="glitch-text" data-text="GORILLA">GORILLA</span> 
              <span className="gradient-text">WARFARE</span>
            </h1>
            <p className="text-2xl md:text-3xl max-w-3xl mb-10">
              The ultimate <span className="text-[#ff3e00] font-bold">PRIMATE SHOWDOWN</span> featuring 
              fierce gorillas, agile monkeys, and powerful apes in a battle for 
              <span className="text-[#b4ff00] font-bold"> JUNGLE SUPREMACY</span> 🦍🐒🦧
            </p>
            <div className="flex flex-col sm:flex-row gap-6 mt-6">
              <button className="btn-primary rounded-full px-10 py-4 text-xl font-bold tracking-wider">
                PRE-ORDER NOW
              </button>
              <button className="btn-secondary rounded-full px-10 py-4 text-xl font-bold tracking-wider">
                WATCH TRAILER
              </button>
            </div>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-3xl aspect-video bg-[#111] rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12rem]">🦍</span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-sm font-mono opacity-70">GAMEPLAY FOOTAGE COMING SOON</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-[#111] relative">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-5xl md:text-6xl font-bold mb-14 text-center">
            <span className="gradient-text">FEATURES THAT SLAP</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333] hover:border-[#ff3e00] transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-5">🦍</div>
              <h3 className="text-2xl font-bold mb-3 text-[#00e1ff]">GORILLA ROSTER</h3>
              <p className="text-[#ccc]">Choose from 12 unique gorillas, each with their own fighting style, backstory, and special moves. From silverbacks to lowland gorillas, the gang&apos;s all here.</p>
            </div>
            
            <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333] hover:border-[#00e1ff] transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-5">🍌</div>
              <h3 className="text-2xl font-bold mb-3 text-[#b4ff00]">BANANA POWER-UPS</h3>
              <p className="text-[#ccc]">Collect bananas during battle to fuel your rage meter. Once full, unleash devastating primate fury with special moves that will leave your opponents shook.</p>
            </div>
            
            <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333] hover:border-[#ff3e00] transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-5">🌴</div>
              <h3 className="text-2xl font-bold mb-3 text-[#ff3e00]">JUNGLE ARENAS</h3>
              <p className="text-[#ccc]">Battle across 8 different environments, from dense rainforests to abandoned research facilities. Each arena has interactive elements and hidden secrets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="py-16 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-5xl md:text-6xl font-bold mb-14 text-center">
            <span className="text-[#ededed]">GAME <span className="text-[#ff3e00]">MODES</span></span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 border-l-4 border-[#ff3e00]">
              <h3 className="text-2xl font-bold mb-3 text-[#ededed]">STORY MODE</h3>
              <p className="mb-4 text-[#ccc]">Follow Kong, a laboratory gorilla who escapes captivity and discovers a world of gorilla fighters competing in underground tournaments. Uncover the conspiracy behind the primate fighting rings.</p>
              <div className="text-sm font-mono text-[#ff3e00]"># NO CAP FR FR</div>
            </div>
            
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 border-l-4 border-[#00e1ff]">
              <h3 className="text-2xl font-bold mb-3 text-[#ededed]">MULTIPLAYER MAYHEM</h3>
              <p className="mb-4 text-[#ccc]">Challenge your friends in local 4-player battles or go online to climb the global leaderboards. Weekly tournaments with exclusive rewards for the top gorilla fighters.</p>
              <div className="text-sm font-mono text-[#00e1ff]"># BUSSIN</div>
            </div>
            
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 border-l-4 border-[#b4ff00]">
              <h3 className="text-2xl font-bold mb-3 text-[#ededed]">BANANA RUSH</h3>
              <p className="mb-4 text-[#ccc]">A fast-paced mode where gorillas compete to collect the most bananas while fighting off opponents. Special power-ups and environmental hazards keep the action unpredictable.</p>
              <div className="text-sm font-mono text-[#b4ff00]"># SHEEEESH</div>
            </div>
            
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 border-l-4 border-[#ff3e00]">
              <h3 className="text-2xl font-bold mb-3 text-[#ededed]">KING OF THE JUNGLE</h3>
              <p className="mb-4 text-[#ccc]">Survival mode where you face increasingly difficult waves of enemy gorillas. How long can you last as the difficulty ramps up? Unlock special cosmetics by reaching high rounds.</p>
              <div className="text-sm font-mono text-[#ff3e00]"># ON GOD</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#111] to-[#0a0a0a] relative">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-8">
            <span className="glitch-text" data-text="JOIN">JOIN</span> THE 
            <span className="gradient-text ml-3">MADNESS</span>
          </h2>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-10">
            Pre-order now and get exclusive access to the beta, plus the limited edition &quot;Silver-Backed&quot; character skin. It&apos;s time to return to monke!
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="btn-primary rounded-full px-10 py-4 text-xl font-bold tracking-wider">
              PRE-ORDER NOW
            </button>
            <button className="btn-secondary rounded-full px-10 py-4 text-xl font-bold tracking-wider">
              JOIN DISCORD
            </button>
          </div>
          <div className="mt-10 flex justify-center gap-8">
            <div className="text-6xl">🦍</div>
            <div className="text-6xl">🍌</div>
            <div className="text-6xl">🦍</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#0a0a0a] border-t border-[#222]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-3xl font-bold mb-2">
                <span className="text-[#ff3e00]">GORILLA</span> 
                <span className="text-[#00e1ff]">WARFARE</span>
              </h3>
              <p className="text-sm text-[#777]">© 2025 Primate Studios. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-lg text-[#ccc] hover:text-[#ff3e00] transition-colors duration-300">Twitter</a>
              <a href="#" className="text-lg text-[#ccc] hover:text-[#00e1ff] transition-colors duration-300">Instagram</a>
              <a href="#" className="text-lg text-[#ccc] hover:text-[#b4ff00] transition-colors duration-300">TikTok</a>
              <a href="#" className="text-lg text-[#ccc] hover:text-[#ff3e00] transition-colors duration-300">Discord</a>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-[#555]">
            <p>Celebrating the diversity of primates: from the mighty gorillas to the clever monkeys and the wise apes.</p>
            <p className="mt-1">Learn more about primate conservation efforts at our website. Join us in protecting these amazing creatures!</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
