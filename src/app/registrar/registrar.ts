import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-registrar',
  styleUrl: './registrar.css',
  templateUrl: './registrar.html',
})
export class Registrar {
      verificarSenha() {
        const senha = "Teste"
        const confirmar = "Teste"
        const email = "teste@example.com";
        // if(email == ""){
        //     document.querySelector(".Email").style.border = "#F22E3B 2px solid"
        //     document.querySelector(".Mensagem").textContent = "ERRO! Usuário não é válido"

        // } else {
        //     if (senha !== confirmar) {
        //         document.querySelector(".ConfirmarSenha").style.border = "#F22E3B 2px solid"
        //         document.querySelector(".Senha").style.border = "#F22E3B 2px solid"
        //         document.querySelector(".Mensagem").textContent = "ERRO! Senhas Divergentes"
        //         return

        //     } else {
        //         document.querySelector(".ConfirmarSenha").style.border = "none"
        //         alert("Registro Criado")
        //         await registrar();
        //         window.location.href = "../Login.html";

        //     }
        // }
  }
  async registrar() {
      const senha = "Teste"
      const email = "teste@example.com"
      const estado = "SP"
      const telefone = "(11) 99999-9999"
      const nome = "Teste Da Silva"

      const resposta = await fetch("https://69ec4ad897482ad5c528424e.mockapi.io/usuario");
      const todosUsuarios = await resposta.json();

      const emailEncontrado = todosUsuarios.find((usuario: any) => usuario.email === email);

      if (emailEncontrado) {
          alert("Email já cadastrado!");
          return;
      }

      // Se não encontrou, prossegue com o POST
      await fetch("https://69ec4ad897482ad5c528424e.mockapi.io/usuario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: senha, estado: estado, telefone: telefone, nome: nome })
      });
      
      alert("Usuário criado com sucesso!");
  }
}
