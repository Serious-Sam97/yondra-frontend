"use client";

import LegalShell, { type LegalContent } from "@/components/legal/LegalShell";

// Draft terms of service for Yondra — a project-management + CRM workspace.
// Bracketed values ([...]) are placeholders the company/attorney must fill in.
// This is a template, not legal advice (see the banner in LegalShell).
const CONTENT: LegalContent = {
  effectiveDate: "2026-07-17",
  pt: {
    kicker: "Jurídico · Termos",
    title: "Termos de Serviço",
    intro: [
      "Estes Termos de Serviço (“Termos”) regem o uso do aplicativo e dos serviços do Yondra (o “Serviço”), fornecidos por [Razão Social da empresa] (“nós”). Ao criar uma conta ou usar o Serviço, você concorda com estes Termos.",
      "Se você utiliza o Serviço em nome de uma organização, declara ter poderes para vinculá-la a estes Termos.",
    ],
    sections: [
      {
        heading: "Aceitação dos Termos",
        blocks: [
          "O uso do Serviço está condicionado à aceitação integral destes Termos e da Política de Privacidade. Caso não concorde, não utilize o Serviço.",
        ],
      },
      {
        heading: "O Serviço",
        blocks: [
          "O Yondra é uma ferramenta de organização de trabalho que inclui, entre outros, quadros e cartões, gestão de projetos, funcionalidades de CRM, automações e integrações. Podemos adicionar, alterar ou descontinuar recursos a qualquer momento.",
        ],
      },
      {
        heading: "Cadastro e conta",
        blocks: [
          "Você é responsável por manter a confidencialidade de suas credenciais e por toda atividade realizada em sua conta. Comprometa-se a fornecer informações verdadeiras e a nos notificar sobre qualquer uso não autorizado.",
        ],
      },
      {
        heading: "Uso aceitável",
        blocks: [
          "Você concorda em não:",
          {
            list: [
              "Violar leis ou direitos de terceiros;",
              "Enviar spam, conteúdo ilícito, difamatório ou malicioso;",
              "Tentar acessar sistemas, dados ou contas sem autorização;",
              "Interferir na segurança ou no funcionamento do Serviço;",
              "Realizar engenharia reversa ou revender o Serviço sem autorização.",
            ],
          },
        ],
      },
      {
        heading: "Seu conteúdo",
        blocks: [
          "Você mantém a titularidade do conteúdo que insere no Serviço. Você nos concede uma licença limitada para hospedar, processar e exibir esse conteúdo apenas com a finalidade de operar e melhorar o Serviço.",
          "Você é o único responsável pelo conteúdo que insere e por ter os direitos necessários para tanto.",
        ],
      },
      {
        heading: "Integrações de terceiros",
        blocks: [
          "O Serviço pode se conectar a serviços de terceiros, como WhatsApp, e-mail e GitHub. O uso dessas integrações também se sujeita aos termos dos respectivos provedores, pelos quais não somos responsáveis.",
        ],
      },
      {
        heading: "Planos e pagamento",
        blocks: [
          "Recursos pagos, quando oferecidos, seguem os preços e condições informados no momento da contratação. Salvo disposição em contrário ou exigência legal, valores pagos não são reembolsáveis. Podemos alterar preços mediante aviso prévio.",
        ],
      },
      {
        heading: "Propriedade intelectual",
        blocks: [
          "O Serviço, incluindo software, marca, layout e conteúdos próprios, é protegido por direitos de propriedade intelectual e pertence a nós ou a nossos licenciadores. Estes Termos não transferem tais direitos a você.",
        ],
      },
      {
        heading: "Disponibilidade e alterações",
        blocks: [
          "Empenhamo-nos em manter o Serviço disponível, mas ele é fornecido “no estado em que se encontra”, sem garantia de operação ininterrupta ou livre de erros. Podemos realizar manutenções e atualizações.",
        ],
      },
      {
        heading: "Isenção de garantias",
        blocks: [
          "Na máxima extensão permitida em lei, o Serviço é fornecido sem garantias de qualquer natureza, expressas ou implícitas, incluindo adequação a uma finalidade específica.",
        ],
      },
      {
        heading: "Limitação de responsabilidade",
        blocks: [
          "Na máxima extensão permitida em lei, não seremos responsáveis por danos indiretos, incidentais ou lucros cessantes decorrentes do uso do Serviço. Nada nestes Termos limita responsabilidades que não possam ser excluídas por lei.",
        ],
      },
      {
        heading: "Rescisão",
        blocks: [
          "Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar o acesso em caso de violação destes Termos ou de risco à segurança do Serviço. Após o encerramento, seu conteúdo poderá ser excluído conforme a Política de Privacidade.",
        ],
      },
      {
        heading: "Lei aplicável e foro",
        blocks: [
          "Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da Comarca de [cidade/UF] para dirimir controvérsias, salvo disposição legal em contrário aplicável ao consumidor.",
        ],
      },
      {
        heading: "Alterações dos Termos",
        blocks: [
          "Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por meios adequados, e o uso continuado do Serviço após a vigência representa concordância com a nova versão.",
        ],
      },
      {
        heading: "Contato",
        blocks: [
          "Dúvidas sobre estes Termos podem ser enviadas para [e-mail de contato].",
        ],
      },
    ],
  },
  en: {
    kicker: "Legal · Terms",
    title: "Terms of Service",
    intro: [
      "These Terms of Service (“Terms”) govern your use of the Yondra application and services (the “Service”), provided by [Company legal name] (“we”). By creating an account or using the Service, you agree to these Terms.",
      "If you use the Service on behalf of an organization, you represent that you have authority to bind it to these Terms.",
    ],
    sections: [
      {
        heading: "Acceptance of Terms",
        blocks: [
          "Use of the Service is conditioned on full acceptance of these Terms and the Privacy Policy. If you do not agree, do not use the Service.",
        ],
      },
      {
        heading: "The Service",
        blocks: [
          "Yondra is a work-organization tool that includes, among other things, boards and cards, project management, CRM features, automations, and integrations. We may add, change, or discontinue features at any time.",
        ],
      },
      {
        heading: "Registration and account",
        blocks: [
          "You are responsible for keeping your credentials confidential and for all activity under your account. You agree to provide accurate information and to notify us of any unauthorized use.",
        ],
      },
      {
        heading: "Acceptable use",
        blocks: [
          "You agree not to:",
          {
            list: [
              "Violate laws or the rights of others;",
              "Send spam or unlawful, defamatory, or malicious content;",
              "Attempt to access systems, data, or accounts without authorization;",
              "Interfere with the security or operation of the Service;",
              "Reverse-engineer or resell the Service without authorization.",
            ],
          },
        ],
      },
      {
        heading: "Your content",
        blocks: [
          "You retain ownership of the content you enter into the Service. You grant us a limited license to host, process, and display that content solely to operate and improve the Service.",
          "You are solely responsible for the content you enter and for holding the necessary rights to do so.",
        ],
      },
      {
        heading: "Third-party integrations",
        blocks: [
          "The Service may connect to third-party services such as WhatsApp, email, and GitHub. Use of these integrations is also subject to the terms of those providers, for which we are not responsible.",
        ],
      },
      {
        heading: "Plans and payment",
        blocks: [
          "Paid features, where offered, follow the prices and conditions shown at the time of purchase. Unless otherwise stated or required by law, amounts paid are non-refundable. We may change prices with prior notice.",
        ],
      },
      {
        heading: "Intellectual property",
        blocks: [
          "The Service, including its software, brand, layout, and proprietary content, is protected by intellectual-property rights and belongs to us or our licensors. These Terms do not transfer those rights to you.",
        ],
      },
      {
        heading: "Availability and changes",
        blocks: [
          "We strive to keep the Service available, but it is provided “as is,” with no guarantee of uninterrupted or error-free operation. We may perform maintenance and updates.",
        ],
      },
      {
        heading: "Disclaimer of warranties",
        blocks: [
          "To the maximum extent permitted by law, the Service is provided without warranties of any kind, express or implied, including fitness for a particular purpose.",
        ],
      },
      {
        heading: "Limitation of liability",
        blocks: [
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of the Service. Nothing in these Terms limits liabilities that cannot be excluded by law.",
        ],
      },
      {
        heading: "Termination",
        blocks: [
          "You may close your account at any time. We may suspend or terminate access if you breach these Terms or pose a risk to the Service’s security. After termination, your content may be deleted in accordance with the Privacy Policy.",
        ],
      },
      {
        heading: "Governing law and venue",
        blocks: [
          "These Terms are governed by the laws of Brazil. The courts of [city/state] are elected to resolve disputes, subject to any consumer-protection rules that apply.",
        ],
      },
      {
        heading: "Changes to the Terms",
        blocks: [
          "We may update these Terms from time to time. Material changes will be communicated by appropriate means, and continued use of the Service after the effective date constitutes acceptance of the new version.",
        ],
      },
      {
        heading: "Contact",
        blocks: ["Questions about these Terms can be sent to [contact email]."],
      },
    ],
  },
};

export default function TermsPage() {
  return <LegalShell content={CONTENT} />;
}
