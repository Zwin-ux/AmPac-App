export interface StaffMember {
    id: string;
    name: string;
    title: string;
    phone: string;
    email?: string;
    linkedin?: string;
    avatar?: string; // URL or local require
}

export const AMPAC_STAFF: StaffMember[] = [
    {
        id: 'hilda-kennedy',
        name: 'Hilda Kennedy',
        title: 'Founder/President',
        phone: '(909) 915-1706',
    },
    {
        id: 'ed-ryan',
        name: 'Ed Ryan',
        title: 'EVP, Director of 504 Sales',
        phone: '(909) 258-4585',
    },
    {
        id: 'jaime-rodriguez',
        name: 'Jaime Rodriguez',
        title: 'SVP, SBA 504 Specialist',
        phone: '(909) 358-4252',
    },
    {
        id: 'janine-warren',
        name: 'Janine Warren',
        title: 'EVP, Director of Loan Integration, Marketing & Training',
        phone: '(909) 915-1706',
    },
    {
        id: 'jeff-sceranka',
        name: 'Jeff Sceranka',
        title: 'EVP, New Markets and Business Development',
        phone: '(909) 351-5211',
    },
    {
        id: 'erik-iwashika',
        name: 'Erik Iwashika',
        title: 'VP, SBA 504 Specialist',
        phone: '(909) 358-4285',
    },
    {
        id: 'lucas-sceranka',
        name: 'Lucas Sceranka',
        title: 'VP, SBA 504 Specialist',
        phone: '(909) 358-4284',
    },
    {
        id: 'ronnie-sylvia',
        name: 'Ronnie Sylvia',
        title: 'VP, SBA 504 Specialist',
        phone: '(909) 258-4588',
    },
    {
        id: 'ian-aguilar',
        name: 'Ian Aguilar',
        title: 'Business Development Associate',
        phone: '(909) 351-5210',
    },
    {
        id: 'ahmed-zwin',
        name: 'Ahmed Zwin',
        title: 'EVP, Director of Government Guaranteed Loan Programs',
        phone: '(909) 351-5205',
    },
    {
        id: 'mark-morales',
        name: 'Mark Morales',
        title: 'SVP, Community Lending & 504 Specialist',
        phone: '(909) 358-4279',
    },
    {
        id: 'hunter-bell',
        name: 'Hunter Bell',
        title: 'AVP, Business Development Officer',
        phone: '(909) 358-4257',
    },
    {
        id: 'brian-kennedy-jr',
        name: 'Brian Kennedy, Jr',
        title: 'Entrepreneur Ecosystem Director',
        phone: '(909) 358-4256',
    },
    {
        id: 'miriam-torres-baltys',
        name: 'Miriam Torres Baltys',
        title: 'SVP – Business Development of Community Lending',
        phone: '(909) 358-4254',
    },
];
