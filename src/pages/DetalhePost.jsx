import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Share2, 
  MoreHorizontal, 
  FileText, 
  Send, 
  Smile, 
  Paperclip, 
  Pin, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  ShieldAlert,
  Download,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

// Dicionário simples de palavras inadequadas para o filtro de linguagem
const PALAVRAS_OFENSIVAS = [
  'porra', 'merda', 'caralho', 'puta', 'imbecil', 'idiota', 
  'foder', 'bosta', 'cacete', 'babaca', 'otário', 'fdp'
];

export default function DetalhePost() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [autorPost, setAutorPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState([]);
  const [likes, setLikes] = useState([]);
  const [shares, setShares] = useState([]);
  const [perfisMap, setPerfisMap] = useState({});

  // Interações locais
  const [comentado, setComentado] = useState(false);
  const [ordenacao, setOrdenacao] = useState('mais_recentes');
  
  // Inputs
  const [novoComentario, setNovoComentario] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  // Anexos de Comentário
  const [anexoSimulado, setAnexoSimulado] = useState(null); // { filename, file_url, size }

  // Responder a comentário específico
  const [replyTargetCommentId, setReplyTargetCommentId] = useState(null);
  const [novaRespostaContent, setNovaRespostaContent] = useState('');

  // Modais
  const [modalShareOpen, setModalShareOpen] = useState(false);

  useEffect(() => {
    carregarDadosPost();
  }, [postId, usuario]);

  async function carregarDadosPost() {
    if (!postId) return;
    try {
      setLoading(true);

      // 1. Post
      const { data: dataPost, error: errPost } = await supabase.from('posts').select('*').eq('id', postId).single();
      if (errPost) throw errPost;
      setPost(dataPost);

      // 2. Autor do Post
      const { data: dataAutor } = await supabase.from('profiles').select('*').eq('id', dataPost.user_id).single();
      setAutorPost(dataAutor);

      // 3. Comentários
      const { data: dataComments } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: false });
      setComments(dataComments || []);

      // 4. Respostas
      const commentIds = (dataComments || []).map(c => c.id);
      if (commentIds.length > 0) {
        const { data: dataReplies } = await supabase.from('comment_replies').select('*').in('comment_id', commentIds).order('created_at');
        setReplies(dataReplies || []);
      } else {
        setReplies([]);
      }

      // 5. Curtidas (Unificadas)
      const { data: dataLikes } = await supabase.from('likes').select('*');
      setLikes(dataLikes || []);

      // 6. Compartilhamentos
      const { data: dataShares } = await supabase.from('shares').select('*').eq('post_id', postId);
      setShares(dataShares || []);

      // 7. Mapear Perfis dos Atores das Ações
      const actorIds = [
        dataPost.user_id,
        ...new Set((dataComments || []).map(c => c.user_id)),
        ...new Set((replies || []).map(r => r.user_id)),
        ...new Set((dataLikes || []).map(l => l.user_id))
      ].filter(Boolean);

      if (actorIds.length > 0) {
        const { data: dataPerfis } = await supabase.from('profiles').select('*').in('id', actorIds);
        if (dataPerfis) {
          const map = {};
          dataPerfis.forEach(p => { map[p.id] = p; });
          setPerfisMap(map);
        }
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir postagem.');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'administrador';
  const ehProfessor = () => perfil?.papel === 'professor';

  // --- FILTRO DE LINGUAGEM INADEQUADA ---
  const contemPalavrasInadequadas = (texto) => {
    const textoLimpo = texto.toLowerCase();
    return PALAVRAS_OFENSIVAS.some(palavra => textoLimpo.includes(palavra));
  };

  // --- CURTIDAS ---
  const souCurtidoPost = () => {
    return likes.some(l => l.post_id === postId && l.user_id === usuario?.id);
  };

  const handleToggleCurtidaPost = async () => {
    if (!usuario) return;
    try {
      const curtidaExistente = likes.find(l => l.post_id === postId && l.user_id === usuario.id);
      
      if (curtidaExistente) {
        await supabase.from('likes').delete().eq('id', curtidaExistente.id);
        
        // Notificar banco
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: usuario.id,
          content: `${perfil.nome} removeu a curtida da sua postagem`,
          type: 'like'
        });
      } else {
        await supabase.from('likes').insert({
          user_id: usuario.id,
          post_id: postId
        });

        // Notificar autor do post
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: usuario.id,
          content: `${perfil.nome} curtiu a sua postagem`,
          type: 'like'
        });
      }
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCurtidaComentario = async (commentId) => {
    if (!usuario) return;
    try {
      const curtidaExistente = likes.find(l => l.comment_id === commentId && l.user_id === usuario.id);
      
      if (curtidaExistente) {
        await supabase.from('likes').delete().eq('id', curtidaExistente.id);
      } else {
        await supabase.from('likes').insert({
          user_id: usuario.id,
          comment_id: commentId
        });

        // Notificar dono do comentário
        const commObj = comments.find(c => c.id === commentId);
        if (commObj) {
          await supabase.from('notifications').insert({
            user_id: commObj.user_id,
            actor_id: usuario.id,
            content: `${perfil.nome} curtiu o seu comentário`,
            type: 'like'
          });
        }
      }
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCurtidaResposta = async (replyId) => {
    if (!usuario) return;
    try {
      const curtidaExistente = likes.find(l => l.reply_id === replyId && l.user_id === usuario.id);
      
      if (curtidaExistente) {
        await supabase.from('likes').delete().eq('id', curtidaExistente.id);
      } else {
        await supabase.from('likes').insert({
          user_id: usuario.id,
          reply_id: replyId
        });
      }
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  // --- COMPARTILHAMENTO ---
  const handleCompartilharPost = async (turmaId = null) => {
    try {
      await supabase.from('shares').insert({
        user_id: usuario.id,
        post_id: postId,
        target_turma_id: turmaId
      });

      toast.success('Postagem compartilhada com sucesso!');
      setModalShareOpen(false);
      carregarDadosPost();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao compartilhar.');
    }
  };

  // --- POSTAR COMENTÁRIO ---
  const handlePostarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;

    if (contemPalavrasInadequadas(novoComentario)) {
      toast.error('Seu comentário viola as regras de respeito e convivência do EduConnect.', {
        icon: <ShieldAlert className="text-red-650" size={18} />
      });
      return;
    }

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: usuario.id,
        content: novoComentario.trim(),
        file_url: anexoSimulado?.file_url,
        filename: anexoSimulado?.filename
      });

      if (error) throw error;

      // Notificar dono do post
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: usuario.id,
        content: `${perfil.nome} comentou na sua postagem`,
        type: 'comment'
      });

      setNovoComentario('');
      setAnexoSimulado(null);
      carregarDadosPost();
      toast.success('Comentário publicado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao postar comentário.');
    }
  };

  // --- POSTAR RESPOSTA (THREAD) ---
  const handlePostarResposta = async (e, commentId) => {
    e.preventDefault();
    if (!novaRespostaContent.trim()) return;

    if (contemPalavrasInadequadas(novaRespostaContent)) {
      toast.error('Sua resposta viola as regras de respeito e convivência do EduConnect.', {
        icon: <ShieldAlert className="text-red-650" size={18} />
      });
      return;
    }

    try {
      const { error } = await supabase.from('comment_replies').insert({
        comment_id: commentId,
        user_id: usuario.id,
        content: novaRespostaContent.trim()
      });

      if (error) throw error;

      // Notificar dono do comentário principal
      const commObj = comments.find(c => c.id === commentId);
      if (commObj) {
        await supabase.from('notifications').insert({
          user_id: commObj.user_id,
          actor_id: usuario.id,
          content: `${perfil.nome} respondeu o seu comentário`,
          type: 'comment'
        });
      }

      setNovaRespostaContent('');
      setReplyTargetCommentId(null);
      carregarDadosPost();
      toast.success('Resposta compartilhada!');
    } catch (err) {
      console.error(err);
    }
  };

  // --- MODERAÇÃO DE COMENTÁRIOS ---
  const handleExcluirComentario = async (commentId) => {
    if (!window.confirm('Excluir comentário permanentemente?')) return;
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      toast.success('Comentário excluído.');
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcluirResposta = async (replyId) => {
    if (!window.confirm('Excluir resposta?')) return;
    try {
      await supabase.from('comment_replies').delete().eq('id', replyId);
      toast.success('Resposta excluída.');
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePinComentario = async (commentId, isPinned) => {
    try {
      await supabase.from('comments').update({ is_pinned: !isPinned }).eq('id', commentId);
      toast.success(isPinned ? 'Comentário desfixado' : 'Comentário fixado no topo!');
      carregarDadosPost();
    } catch (err) {
      console.error(err);
    }
  };

  // Simular upload de anexo de comentário
  const handleSimularAnexo = () => {
    const mockFiles = [
      { filename: 'Trabalho_Concluido.pdf', file_url: 'https://example.com/pdf', size: '1.2 MB' },
      { filename: 'Imagem_Exemplo.png', file_url: 'https://example.com/png', size: '840 KB' },
      { filename: 'Resumo_IHC.docx', file_url: 'https://example.com/doc', size: '240 KB' }
    ];
    const chosen = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setAnexoSimulado(chosen);
    toast.success(`Arquivo ${chosen.filename} anexado com sucesso!`);
  };

  // --- ORDENAÇÃO ---
  const getComentariosOrdenados = () => {
    const list = [...comments];
    
    // Comentários fixados (is_pinned) sempre aparecem no topo
    list.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      if (ordenacao === 'mais_recentes') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (ordenacao === 'mais_antigos') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (ordenacao === 'mais_curtidos') {
        const likesA = likes.filter(l => l.comment_id === a.id).length;
        const likesB = likes.filter(l => l.comment_id === b.id).length;
        return likesB - likesA;
      }
      return 0;
    });

    return list;
  };

  const formatarDataCompleta = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || !post) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando postagem...</p>
      </div>
    );
  }

  // Estatísticas e Curtidas
  const curtidasPost = likes.filter(l => l.post_id === postId);
  const totalCurtidas = curtidasPost.length;
  
  // Gerar o texto de quem curtiu
  const getCurtiramTexto = () => {
    if (totalCurtidas === 0) return 'Seja o primeiro a curtir';
    const nomes = curtidasPost.map(l => perfisMap[l.user_id]?.nome).filter(Boolean);
    const voceCurtiu = souCurtidoPost();

    if (voceCurtiu) {
      if (totalCurtidas === 1) return 'Você curtiu esta postagem';
      if (totalCurtidas === 2) return `Você e ${nomes[0] !== perfil.nome ? nomes[0] : nomes[1]} curtiram`;
      return `Você, ${nomes[0] !== perfil.nome ? nomes[0] : nomes[1]} e outras ${totalCurtidas - 2} pessoas curtiram`;
    }

    if (totalCurtidas === 1) return `${nomes[0]} curtiu`;
    if (totalCurtidas === 2) return `${nomes[0]} e ${nomes[1]} curtiram`;
    return `${nomes[0]}, ${nomes[1]} e outras ${totalCurtidas - 2} pessoas curtiram`;
  };

  return (
    <div className="space-y-6">
      
      {/* LINK DE VOLTAR */}
      <button 
        onClick={() => navigate('/feed')}
        className="flex items-center gap-2 text-[12px] font-bold text-gray-600 hover:text-black cursor-pointer bg-white border border-gray-100 px-4 py-2.5 rounded-xl self-start shadow-sm transition-all"
      >
        <ArrowLeft size={15} /> Voltar para o feed
      </button>

      {/* CONTAINER PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: POST DETALHADO + COMENTÁRIOS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD DO POST */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            
            {/* Header autor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-150 border border-gray-200">
                  {autorPost?.avatar_url ? (
                    <img src={autorPost.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{autorPost?.nome?.[0] || 'U'}</div>
                  )}
                </div>
                <div>
                  <span className="text-[13.5px] font-extrabold text-gray-950 block">{autorPost?.nome}</span>
                  <span className="text-[10.5px] text-gray-400 font-light block">{autorPost?.turma} • {formatarTempoRelativo(post.created_at)}</span>
                </div>
              </div>

              <span className="text-[10px] bg-violet-50 text-violet-750 font-extrabold px-2.5 py-0.5 rounded-full uppercase">{post.tipo || 'Geral'}</span>
            </div>

            {/* Conteúdo Textual */}
            <div className="space-y-2">
              <h2 className="text-[17px] font-black text-gray-950 tracking-tight leading-snug">{post.title}</h2>
              <p className="text-[13.5px] text-gray-650 font-light leading-relaxed whitespace-pre-line">{post.content}</p>
            </div>

            {/* Imagem de Capa (se houver) */}
            {post.image_url && (
              <div className="rounded-[1.8rem] overflow-hidden border border-gray-100 max-h-[360px] bg-gray-50 flex items-center justify-center">
                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Linha de Curtidas e Avatares */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-50 pt-4">
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleToggleCurtidaPost}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${souCurtidoPost() ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  <Heart size={14} className={souCurtidoPost() ? 'fill-red-500' : ''} />
                  <span>Curtir</span>
                </button>

                <button className="px-4 py-2 rounded-xl text-[12px] font-bold bg-violet-50 border border-violet-100 text-violet-700 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  <span>{comments.length} Comentários</span>
                </button>

                <button 
                  onClick={() => setModalShareOpen(true)}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold bg-gray-50 border border-gray-250 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>Compartilhar</span>
                </button>
              </div>

              {/* Curtiram avatares */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {curtidasPost.slice(0, 3).map(l => {
                    const p = perfisMap[l.user_id] || {};
                    return (
                      <div key={l.id} className="w-5.5 h-5.5 rounded-full border border-white bg-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-gray-400">{p.nome?.[0]}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-gray-450 font-bold">{getCurtiramTexto()}</span>
              </div>

            </div>

          </div>

          {/* SESSÃO DE COMENTÁRIOS */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            
            {/* Header + Ordenação */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="text-[14px] font-black text-gray-950">Comentários ({comments.length})</h3>
              
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                className="bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="mais_recentes">Mais recentes</option>
                <option value="mais_antigos">Mais antigos</option>
                <option value="mais_curtidos">Mais curtidos</option>
              </select>
            </div>

            {/* Input Novo Comentário */}
            <form onSubmit={handlePostarComentario} className="flex gap-3.5 items-start bg-gray-50 p-4.5 rounded-2xl border border-gray-150 relative">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {perfil?.avatar_url ? (
                  <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{perfil?.nome?.[0]}</div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="w-full bg-white border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />

                {/* Anexo selecionado */}
                {anexoSimulado && (
                  <div className="flex items-center justify-between bg-violet-50 text-violet-750 px-3 py-1.5 rounded-xl text-[11px] border border-violet-100">
                    <span className="font-bold">{anexoSimulado.filename} ({anexoSimulado.size})</span>
                    <button onClick={() => setAnexoSimulado(null)} className="text-red-500 hover:text-red-700 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      className="p-2 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-500 cursor-pointer"
                      title="Emojis"
                    >
                      <Smile size={15} />
                    </button>

                    <button 
                      type="button"
                      onClick={handleSimularAnexo}
                      className="p-2 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-500 cursor-pointer"
                      title="Anexar arquivo"
                    >
                      <Paperclip size={15} />
                    </button>
                  </div>

                  <button 
                    type="submit"
                    className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12.5px] px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Send size={13} /> Publicar
                  </button>
                </div>
              </div>

              {/* Emoji Picker Simples Dropdown */}
              {emojiPickerOpen && (
                <div className="absolute left-6 bottom-16 bg-white border border-gray-150 rounded-2xl shadow-xl p-3 z-30 grid grid-cols-6 gap-2">
                  {['😀', '😂', '😍', '👏', '👍', '🔥', '🎓', '📚', '🚀', '🌱', '💻', '💡'].map(emoji => (
                    <button 
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNovoComentario(prev => prev + emoji);
                        setEmojiPickerOpen(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Listagem de Comentários */}
            <div className="space-y-6">
              {getComentariosOrdenados().map(comment => {
                const autorC = perfisMap[comment.user_id] || {};
                const curtidasC = likes.filter(l => l.comment_id === comment.id);
                const souCurtidoC = curtidasC.some(l => l.user_id === usuario.id);
                const respostasC = replies.filter(r => r.comment_id === comment.id);

                return (
                  <div key={comment.id} className="space-y-4 pt-4 first:pt-0 border-t border-gray-50 first:border-none">
                    
                    {/* Comentário Item */}
                    <div className="flex gap-3">
                      <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-gray-150 border border-gray-200 flex-shrink-0 shadow-sm">
                        {autorC.avatar_url ? (
                          <img src={autorC.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{autorC.nome?.[0]}</div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[12.5px] text-gray-900">{autorC.nome}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              autorC.papel === 'administrador' ? 'bg-blue-100 text-blue-700' :
                              autorC.papel === 'professor' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                            }`}>{autorC.papel}</span>
                            
                            {comment.is_pinned && <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><Pin size={8} /> Fixado</span>}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-light">{formatarTempoRelativo(comment.created_at)}</span>
                            
                            {/* Opções de moderação */}
                            <div className="flex items-center gap-1.5">
                              {ehProfessor() && (
                                <button 
                                  onClick={() => handleTogglePinComentario(comment.id, comment.is_pinned)}
                                  className={`p-1 rounded-lg ${comment.is_pinned ? 'text-amber-600 bg-amber-50' : 'text-gray-450 hover:bg-gray-100'} cursor-pointer`}
                                  title="Fixar comentário"
                                >
                                  <Pin size={12} />
                                </button>
                              )}

                              {(comment.user_id === usuario.id || ehProfessor() || ehAdmin()) && (
                                <button 
                                  onClick={() => handleExcluirComentario(comment.id)}
                                  className="p-1 text-gray-450 hover:text-red-650 rounded-lg hover:bg-red-50 cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-[12.5px] text-gray-700 font-light leading-relaxed">{comment.content}</p>

                        {/* Anexo de comentário */}
                        {comment.file_url && (
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-2.5 rounded-xl max-w-xs text-[11px] font-bold text-gray-750">
                            <FileText size={15} className="text-violet-600" />
                            <span className="truncate flex-1">{comment.filename || 'Arquivo'}</span>
                            <a href={comment.file_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black">
                              <Download size={13} />
                            </a>
                          </div>
                        )}

                        {/* Ações: Curtir e Responder */}
                        <div className="flex items-center gap-4 pt-1 text-[11px] font-bold text-gray-550 select-none">
                          <button 
                            onClick={() => handleCurtidaComentario(comment.id)}
                            className={`flex items-center gap-1 hover:text-red-550 cursor-pointer ${souCurtidoC ? 'text-red-550' : ''}`}
                          >
                            <Heart size={12} className={souCurtidoC ? 'fill-red-500' : ''} />
                            <span>{curtidasC.length} curtidas</span>
                          </button>

                          <button 
                            onClick={() => setReplyTargetCommentId(comment.id)}
                            className="hover:text-violet-650 cursor-pointer"
                          >
                            Responder
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Thread: Respostas (Aninhadas) */}
                    {respostasC.length > 0 && (
                      <div className="pl-10 space-y-4 border-l-2 border-gray-50 ml-4.5 pt-1">
                        {respostasC.map(reply => {
                          const autorR = perfisMap[reply.user_id] || {};
                          const curtidasR = likes.filter(l => l.reply_id === reply.id);
                          const souCurtidoR = curtidasR.some(l => l.user_id === usuario.id);

                          return (
                            <div key={reply.id} className="flex gap-2.5 items-start">
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-150 border border-gray-200 flex-shrink-0">
                                {autorR.avatar_url ? (
                                  <img src={autorR.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{autorR.nome?.[0]}</div>
                                )}
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-[12px] text-gray-900">{autorR.nome}</span>
                                    <span className="text-[9px] text-gray-400 font-light">{formatarTempoRelativo(reply.created_at)}</span>
                                  </div>

                                  {(reply.user_id === usuario.id || ehProfessor() || ehAdmin()) && (
                                    <button 
                                      onClick={() => handleExcluirResposta(reply.id)}
                                      className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg cursor-pointer"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>

                                <p className="text-[12px] text-gray-700 font-light leading-relaxed">{reply.content}</p>

                                <button 
                                  onClick={() => handleCurtidaResposta(reply.id)}
                                  className={`flex items-center gap-1 text-[10.5px] font-bold text-gray-500 hover:text-red-550 pt-1.5 cursor-pointer ${souCurtidoR ? 'text-red-550' : ''}`}
                                >
                                  <Heart size={11} className={souCurtidoR ? 'fill-red-500' : ''} />
                                  <span>{curtidasR.length}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Caixa de Texto de Resposta (quando selecionado) */}
                    {replyTargetCommentId === comment.id && (
                      <form 
                        onSubmit={(e) => handlePostarResposta(e, comment.id)}
                        className="pl-10 ml-4.5 flex gap-2.5 items-center"
                      >
                        <input 
                          type="text" 
                          value={novaRespostaContent}
                          onChange={(e) => setNovaRespostaContent(e.target.value)}
                          placeholder="Escreva uma resposta..."
                          className="flex-1 bg-gray-50 border border-gray-250 rounded-xl px-3 py-2 text-[12px] outline-none"
                        />
                        <button 
                          type="submit" 
                          className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-[11px] px-4 py-2 rounded-xl cursor-pointer"
                        >
                          Responder
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setReplyTargetCommentId(null)}
                          className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </form>
                    )}

                  </div>
                );
              })}

              {comments.length === 0 && (
                <p className="text-center py-6 text-gray-450 text-[12.5px] font-light">Nenhum comentário publicado nesta postagem.</p>
              )}
            </div>

          </div>

        </div>

        {/* COLUNA DIREITA: INFORMAÇÕES, INTERAÇÕES E REGRAS */}
        <div className="space-y-6">
          
          {/* Informações da postagem */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Informações da postagem</h3>
            
            <div className="space-y-3.5 text-[12px] font-medium text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Turma</span>
                <span className="text-gray-950 font-bold">{autorPost?.turma || 'EduConnect'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tipo de conteúdo</span>
                <span className="text-gray-950 font-bold">{post.tipo || 'Geral'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Publicado em</span>
                <span className="text-gray-950 font-bold">{formatarDataCompleta(post.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Autor</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                    {autorPost?.avatar_url && <img src={autorPost.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-gray-950 font-bold">{autorPost?.nome}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interações */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3.5">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Interações</h3>
            
            <div className="flex justify-around text-center py-2 text-[12px]">
              <div>
                <Heart size={18} className="text-red-500 fill-red-500 mx-auto" />
                <span className="block font-black text-gray-900 text-[14px] mt-1">{totalCurtidas}</span>
                <span className="text-[10px] text-gray-400 font-light">Curtidas</span>
              </div>
              
              <div>
                <MessageSquare size={18} className="text-blue-500 mx-auto" />
                <span className="block font-black text-gray-900 text-[14px] mt-1">{comments.length}</span>
                <span className="text-[10px] text-gray-400 font-light">Comentários</span>
              </div>

              <div>
                <Share2 size={18} className="text-green-500 mx-auto" />
                <span className="block font-black text-gray-900 text-[14px] mt-1">{shares.length}</span>
                <span className="text-[10px] text-gray-400 font-light">Compartilhamentos</span>
              </div>
            </div>
          </div>

          {/* Pessoas que curtiram grid */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Pessoas que curtiram</h3>
            
            <div className="flex flex-wrap gap-2.5">
              {curtidasPost.slice(0, 8).map(l => {
                const p = perfisMap[l.user_id] || {};
                return (
                  <div key={l.id} className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-sm" title={p.nome}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-[10px]">{p.nome?.[0]}</div>
                    )}
                  </div>
                );
              })}
              {totalCurtidas > 8 && (
                <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-700 font-extrabold text-[10px] flex items-center justify-center border border-violet-100 shadow-sm">
                  +{totalCurtidas - 8}
                </div>
              )}
              {totalCurtidas === 0 && (
                <p className="text-center w-full py-4 text-gray-450 text-[11px] font-light">Sem curtidas ainda.</p>
              )}
            </div>
          </div>

          {/* Arquivos anexados */}
          {post.file_url && (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Arquivos anexados</h3>
              
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-3.5 rounded-2xl text-[11.5px] font-bold text-gray-750">
                <FileText size={18} className="text-red-500" />
                <div className="flex-1 truncate">
                  <span className="block truncate font-extrabold text-gray-900">{post.filename || 'Material.pdf'}</span>
                  <span className="block text-[9.5px] text-gray-400 font-light mt-0.5">2.4 MB</span>
                </div>
                <a 
                  href={post.file_url}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-550 hover:bg-gray-100"
                >
                  <Download size={13} />
                </a>
              </div>
            </div>
          )}

          {/* Hashtags */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Hashtags</h3>
            
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {['#sustentabilidade', '#projeto', '#meioambiente', '#estudo'].map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-violet-50 text-violet-750 rounded-lg cursor-pointer hover:bg-violet-100 transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Regras da comunidade */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-3.5">
            <h3 className="text-[13px] font-bold text-gray-950 mb-1 pl-1 border-l-2 border-violet-500">Regras da comunidade</h3>
            <p className="text-[11.5px] text-gray-450 font-light leading-relaxed">Seja respeitoso e contribua de forma positiva.</p>
            <button 
              onClick={() => toast.info('Leia as diretrizes na aba de configurações!')}
              className="w-full text-center py-2 text-[11.5px] font-bold text-gray-650 hover:text-black border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Ver todas as regras
            </button>
          </div>

        </div>

      </div>

      {/* MODAL DE COMPARTILHAMENTO */}
      {modalShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalShareOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[420px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[14px] font-bold text-gray-950 flex items-center gap-1.5">
                <Share2 size={16} className="text-violet-600" /> Compartilhar Postagem
              </h3>
              <button onClick={() => setModalShareOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleCompartilharPost()}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-[12px] font-bold text-gray-700 cursor-pointer"
              >
                Compartilhar no meu perfil <ChevronRight size={14} className="text-gray-400" />
              </button>

              <button 
                onClick={() => handleCompartilharPost()}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-[12px] font-bold text-gray-700 cursor-pointer"
              >
                Compartilhar na área de destaques <ChevronRight size={14} className="text-gray-400" />
              </button>

              {(ehProfessor() || ehAdmin()) && (
                <button 
                  onClick={() => handleCompartilharPost()}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-[12px] font-bold text-gray-700 cursor-pointer"
                >
                  Compartilhar para outra turma <ChevronRight size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
