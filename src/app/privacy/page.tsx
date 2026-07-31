"use client";

import LegalShell, { type LegalContent } from "@/components/legal/LegalShell";

// Draft privacy policy for Yondra — a project-management + CRM workspace.
// Bracketed values ([...]) are placeholders the company/attorney must fill in.
// This is a template, not legal advice (see the banner in LegalShell).
const CONTENT: LegalContent = {
  effectiveDate: "2026-07-17",
  pt: {
    kicker: "Jurídico · Privacidade",
    title: "Política de Privacidade",
    intro: [
      "Esta Política de Privacidade explica como o Yondra coleta, usa, compartilha e protege dados pessoais quando você utiliza nosso aplicativo e serviços (o “Serviço”). Ela foi elaborada tendo como referência a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – “LGPD”) e, quando aplicável, o Regulamento Geral de Proteção de Dados da União Europeia (“GDPR”).",
      "Ao criar uma conta ou usar o Serviço, você declara que leu e compreendeu esta Política.",
    ],
    sections: [
      {
        heading: "Quem somos (Controlador)",
        blocks: [
          "O controlador dos dados é [Razão Social da empresa], inscrita no CNPJ sob nº [CNPJ], com sede em [endereço].",
          "Para questões sobre privacidade, entre em contato com nosso Encarregado (DPO): [nome do Encarregado] — [e-mail de contato].",
        ],
      },
      {
        heading: "Dados que coletamos",
        blocks: [
          "Coletamos as seguintes categorias de dados:",
          {
            list: [
              "Dados de cadastro: nome, e-mail e senha (armazenada de forma criptografada).",
              "Conteúdo do espaço de trabalho: projetos, quadros, cartões, comentários, checklists, anexos e demais informações que você cria no Serviço.",
              "Dados de CRM inseridos por você: nomes, e-mails, telefones e demais informações de contatos, clientes e negócios que você registra.",
              "Dados de integrações: informações trocadas com serviços que você conecta, como WhatsApp, e-mail e GitHub.",
              "Dados de uso e técnicos: endereço IP, tipo de dispositivo e navegador, páginas acessadas, registros de erro e diagnóstico.",
              "Cookies e identificadores necessários para autenticação e funcionamento do Serviço.",
            ],
          },
        ],
      },
      {
        heading: "Como usamos os dados",
        blocks: [
          "Usamos os dados para:",
          {
            list: [
              "Fornecer, manter e melhorar o Serviço;",
              "Autenticar seu acesso e proteger a segurança da conta;",
              "Processar automações que você configura (mensagens, e-mails, movimentações de cartões);",
              "Prestar suporte e responder às suas solicitações;",
              "Detectar, prevenir e investigar fraudes, abusos e incidentes de segurança;",
              "Cumprir obrigações legais e regulatórias.",
            ],
          },
        ],
      },
      {
        heading: "Bases legais do tratamento",
        blocks: [
          "Tratamos dados pessoais com fundamento em uma ou mais bases legais previstas na LGPD, conforme o caso: execução de contrato (art. 7º, V), cumprimento de obrigação legal (art. 7º, II), legítimo interesse (art. 7º, IX) e consentimento (art. 7º, I), quando aplicável.",
        ],
      },
      {
        heading: "Compartilhamento e operadores",
        blocks: [
          "Não vendemos seus dados pessoais. Compartilhamos dados apenas na medida necessária com prestadores que atuam como operadores em nosso nome, tais como:",
          {
            list: [
              "Provedores de hospedagem e infraestrutura em nuvem;",
              "Provedores de envio de e-mail e mensageria (incluindo WhatsApp);",
              "Provedores de inteligência artificial usados nas funcionalidades de IA;",
              "Serviços de análise e monitoramento de erros.",
            ],
          },
          "Também podemos divulgar dados quando exigido por lei ou ordem de autoridade competente.",
        ],
      },
      {
        heading: "Dados de terceiros que você insere",
        blocks: [
          "Ao registrar informações de contatos, clientes ou negócios em nosso CRM, você atua como controlador desses dados e é responsável por ter base legal adequada e por informar os titulares, quando exigido. O Yondra trata esses dados como operador, seguindo suas instruções.",
        ],
      },
      {
        heading: "Cookies e tecnologias semelhantes",
        blocks: [
          "Utilizamos cookies e armazenamento local estritamente necessários para manter sua sessão autenticada e para o funcionamento básico do Serviço. Não utilizamos cookies de publicidade de terceiros.",
        ],
      },
      {
        heading: "Retenção de dados",
        blocks: [
          "Mantemos os dados pelo tempo necessário para as finalidades descritas nesta Política ou conforme exigido por lei. Ao encerrar sua conta, excluímos ou anonimizamos os dados dentro de um prazo razoável, ressalvadas as hipóteses de guarda obrigatória.",
        ],
      },
      {
        heading: "Segurança da informação",
        blocks: [
          "Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia de senhas, controle de acesso e transmissão via conexões seguras. Nenhum sistema é totalmente imune a riscos, mas trabalhamos para reduzi-los continuamente.",
        ],
      },
      {
        heading: "Transferências internacionais",
        blocks: [
          "Alguns operadores podem processar dados fora do Brasil. Nesses casos, adotamos salvaguardas adequadas para garantir um nível de proteção compatível com a legislação aplicável.",
        ],
      },
      {
        heading: "Seus direitos",
        blocks: [
          "Você pode, a qualquer momento, solicitar:",
          {
            list: [
              "Confirmação da existência de tratamento e acesso aos seus dados;",
              "Correção de dados incompletos, inexatos ou desatualizados;",
              "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;",
              "Portabilidade dos dados;",
              "Informação sobre com quem seus dados são compartilhados;",
              "Revogação do consentimento, quando essa for a base legal.",
            ],
          },
          "Para exercer seus direitos, entre em contato pelo e-mail informado ao final desta Política.",
        ],
      },
      {
        heading: "Crianças e adolescentes",
        blocks: [
          "O Serviço não se destina a menores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes.",
        ],
      },
      {
        heading: "Alterações desta Política",
        blocks: [
          "Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas por meios adequados. A data de vigência no topo indica a versão mais recente.",
        ],
      },
      {
        heading: "Contato",
        blocks: [
          "Dúvidas sobre privacidade ou solicitações de titulares podem ser enviadas para [e-mail de contato].",
        ],
      },
    ],
  },
  en: {
    kicker: "Legal · Privacy",
    title: "Privacy Policy",
    intro: [
      "This Privacy Policy explains how Yondra collects, uses, shares, and protects personal data when you use our application and services (the “Service”). It is written with reference to Brazil’s General Data Protection Law (Law No. 13,709/2018, “LGPD”) and, where applicable, the EU General Data Protection Regulation (“GDPR”).",
      "By creating an account or using the Service, you confirm that you have read and understood this Policy.",
    ],
    sections: [
      {
        heading: "Who we are (Controller)",
        blocks: [
          "The data controller is [Company legal name], registered under tax ID [CNPJ], with its office at [address].",
          "For privacy matters, contact our Data Protection Officer (DPO): [DPO name] — [contact email].",
        ],
      },
      {
        heading: "Data we collect",
        blocks: [
          "We collect the following categories of data:",
          {
            list: [
              "Account data: name, email, and password (stored in encrypted form).",
              "Workspace content: projects, boards, cards, comments, checklists, attachments, and other information you create in the Service.",
              "CRM data you enter: names, emails, phone numbers, and other information about contacts, clients, and deals you record.",
              "Integration data: information exchanged with services you connect, such as WhatsApp, email, and GitHub.",
              "Usage and technical data: IP address, device and browser type, pages visited, error and diagnostic logs.",
              "Cookies and identifiers required for authentication and operation of the Service.",
            ],
          },
        ],
      },
      {
        heading: "How we use data",
        blocks: [
          "We use data to:",
          {
            list: [
              "Provide, maintain, and improve the Service;",
              "Authenticate your access and protect account security;",
              "Run the automations you configure (messages, emails, card movements);",
              "Provide support and respond to your requests;",
              "Detect, prevent, and investigate fraud, abuse, and security incidents;",
              "Comply with legal and regulatory obligations.",
            ],
          },
        ],
      },
      {
        heading: "Legal bases for processing",
        blocks: [
          "We process personal data under one or more legal bases, as applicable: performance of a contract, compliance with a legal obligation, legitimate interests, and consent where required — corresponding to LGPD Article 7 and GDPR Article 6.",
        ],
      },
      {
        heading: "Sharing and processors",
        blocks: [
          "We do not sell your personal data. We share data only as needed with providers acting as processors on our behalf, such as:",
          {
            list: [
              "Cloud hosting and infrastructure providers;",
              "Email and messaging providers (including WhatsApp);",
              "Artificial-intelligence providers used in AI features;",
              "Analytics and error-monitoring services.",
            ],
          },
          "We may also disclose data where required by law or by order of a competent authority.",
        ],
      },
      {
        heading: "Third-party data you enter",
        blocks: [
          "When you record information about contacts, clients, or deals in our CRM, you act as the controller of that data and are responsible for having an adequate legal basis and for informing data subjects where required. Yondra processes such data as a processor, following your instructions.",
        ],
      },
      {
        heading: "Cookies and similar technologies",
        blocks: [
          "We use cookies and local storage that are strictly necessary to keep your session authenticated and to run the core Service. We do not use third-party advertising cookies.",
        ],
      },
      {
        heading: "Data retention",
        blocks: [
          "We retain data for as long as necessary for the purposes described in this Policy or as required by law. When you close your account, we delete or anonymize data within a reasonable period, except where mandatory retention applies.",
        ],
      },
      {
        heading: "Information security",
        blocks: [
          "We apply technical and organizational measures to protect data, including password encryption, access controls, and transmission over secure connections. No system is fully immune to risk, but we work to reduce it continuously.",
        ],
      },
      {
        heading: "International transfers",
        blocks: [
          "Some processors may handle data outside Brazil. In such cases, we apply appropriate safeguards to ensure a level of protection consistent with applicable law.",
        ],
      },
      {
        heading: "Your rights",
        blocks: [
          "At any time, you may request:",
          {
            list: [
              "Confirmation that processing exists and access to your data;",
              "Correction of incomplete, inaccurate, or outdated data;",
              "Anonymization, blocking, or deletion of unnecessary or non-compliant data;",
              "Data portability;",
              "Information about who your data is shared with;",
              "Withdrawal of consent, where consent is the legal basis.",
            ],
          },
          "To exercise your rights, contact us at the email listed at the end of this Policy.",
        ],
      },
      {
        heading: "Children and adolescents",
        blocks: [
          "The Service is not intended for anyone under 18. We do not knowingly collect data from children or adolescents.",
        ],
      },
      {
        heading: "Changes to this Policy",
        blocks: [
          "We may update this Policy from time to time. Material changes will be communicated by appropriate means. The effective date at the top indicates the most recent version.",
        ],
      },
      {
        heading: "Contact",
        blocks: [
          "Privacy questions or data-subject requests can be sent to [contact email].",
        ],
      },
    ],
  },
};

export default function PrivacyPage() {
  return <LegalShell content={CONTENT} />;
}
