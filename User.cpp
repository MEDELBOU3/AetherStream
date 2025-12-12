#include "main/AetherStreamApp.h"
#include <iostream>
#include <cstdlib>

int main() {
    std::cout << "=== AetherStream - Application de Streaming Desktop ===" << std::endl;
    std::cout << "Version: 1.0.0" << std::endl;
    std::cout << "Compilé le: " << __DATE__ << " " << __TIME__ << std::endl;
    std::cout << std::endl;
    
    try {
        AetherStreamApp app;
        
        if (!app.initialize()) {
            std::cerr << "Échec de l'initialisation de l'application." << std::endl;
            return EXIT_FAILURE;
        }
        
        app.run();
        app.shutdown();
        
    } catch (const std::exception& e) {
        std::cerr << "Erreur fatale: " << e.what() << std::endl;
        return EXIT_FAILURE;
    } catch (...) {
        std::cerr << "Erreur fatale inconnue." << std::endl;
        return EXIT_FAILURE;
    }
    
    std::cout << "=== AetherStream - Fermeture de l'application ===" << std::endl;
    return EXIT_SUCCESS;
}