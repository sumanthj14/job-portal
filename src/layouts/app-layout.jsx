import Header from "@/components/header";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div>
      <div className="grid-background"></div>
      <main className="min-h-screen container">
        <Header />
        <Outlet />
      </main>
      <footer className="p-4 sm:p-6 md:p-8 text-center bg-gray-800 mt-10 border-t border-gray-700">
        <div className="container mx-auto">
          <div className="flex flex-col gap-3 md:gap-5">
            <img src="/logo.png" className="w-[120px] h-[40px] object-contain mx-auto mb-2" alt="Posspole Logo" />
            {/* <p className="text-gray-300 text-xs sm:text-sm">Find your dream job or the perfect candidate</p> */}
            {/* <div className="flex justify-center gap-4 text-xs sm:text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div> */}
            <p className="text-gray-400 text-xs mt-2">Copyright © Posspole 2025. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
